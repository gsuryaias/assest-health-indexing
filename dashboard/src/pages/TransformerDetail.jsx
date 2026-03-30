import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info, FileText, Shield } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import GasTrendChart from '../components/charts/GasTrendChart';
import RiskBadge from '../components/shared/RiskBadge';
import FaultBadge from '../components/shared/FaultBadge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { RISK_COLORS } from '../constants/colors';
import { FAULT_DESCRIPTIONS } from '../constants/thresholds';
import { formatDate, formatGas } from '../utils/formatters';

const GAS_COLS = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2', 'CO', 'CO2'];
const OIL_LABELS = { BDV: 'BDV (kV)', MOISTURE: 'Moisture (ppm)', RESISTIVITY: 'Resistivity', TAN_DELTA: 'Tan Delta', ACIDITY: 'Acidity' };

function RiskExplanation({ explanation, riskLevel }) {
  if (!explanation) return null;
  const { gas_alerts, oil_alerts, condition_override } = explanation;
  const hasAlerts = (gas_alerts?.length > 0) || (oil_alerts?.length > 0) || condition_override?.active;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        Why is this transformer rated "{riskLevel}"?
      </h3>
      {!hasAlerts ? (
        <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">All parameters within normal limits</p>
            <p className="text-xs text-emerald-600 mt-0.5">All gas concentrations are below IEEE C57.104-2019 Status 1 thresholds. Oil quality parameters are within acceptable ranges.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {condition_override?.active && (
            <div className="flex items-start gap-2 text-sm rounded-lg p-3 bg-purple-50 text-purple-800">
              <Shield className="w-4 h-4 mt-0.5 shrink-0 text-purple-500" />
              <div>
                <p className="font-medium">{condition_override.msg}</p>
                <p className="text-xs opacity-75 mt-0.5">
                  CIGRE TB 761 two-component model: fault severity overrides aggregate health score
                </p>
              </div>
            </div>
          )}
          {gas_alerts?.map((a, i) => (
            <div key={i} className={`flex items-start gap-2 text-sm rounded-lg p-3 ${
              a.severity === 'high' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
            }`}>
              <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                a.severity === 'high' ? 'text-red-500' : 'text-amber-500'
              }`} />
              <div>
                <p className="font-medium">{a.msg}</p>
                <p className="text-xs opacity-75 mt-0.5">
                  {a.severity === 'high' ? 'IEEE C57.104-2019 Status 3 — Active fault suspected' :
                   'IEEE C57.104-2019 Status 2 — Possible incipient fault'}
                </p>
              </div>
            </div>
          ))}
          {oil_alerts?.map((a, i) => (
            <div key={`oil-${i}`} className={`flex items-start gap-2 text-sm rounded-lg p-3 ${
              a.severity === 'high' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
            }`}>
              <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                a.severity === 'high' ? 'text-red-500' : 'text-amber-500'
              }`} />
              <div>
                <p className="font-medium">{a.msg}</p>
                <p className="text-xs opacity-75 mt-0.5">Oil quality degradation per IEC 60422</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DiagnosisMethods({ methods }) {
  const [open, setOpen] = useState(true);
  if (!methods || !Array.isArray(methods)) return null;

  const methodsWithResults = methods.filter(m => m.result);
  const methodsWithout = methods.filter(m => !m.result);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <button
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-2">
          Diagnosis Methods
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
            {methodsWithResults.length}/{methods.length} applied
          </span>
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Methods that produced results */}
          {methodsWithResults.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Applied methods</p>
              {methodsWithResults.map(m => (
                <div key={m.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <span className="text-sm text-gray-700 font-medium">{m.name}</span>
                    <span className="text-[10px] text-gray-400 ml-2">{m.ref}</span>
                  </div>
                  <FaultBadge label={m.result} />
                </div>
              ))}
            </div>
          )}
          {/* Methods that could not run */}
          {methodsWithout.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Could not apply</p>
              {methodsWithout.map(m => (
                <div key={m.key} className="py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-gray-400">{m.name}</span>
                      <span className="text-[10px] text-gray-300 ml-2">{m.ref}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">N/A</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {m.missing_gases?.length > 0
                      ? `Missing required gas data: ${m.missing_gases.join(', ')} (needs: ${m.required_gases.join(', ')})`
                      : 'Gas ratios did not match any known fault pattern'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TransformerDetail() {
  const { id } = useParams();
  const { state, loadHistory } = useDashboard();
  const [historyOpen, setHistoryOpen] = useState(false);

  const transformer = useMemo(
    () => (state.transformers || []).find(t => t.equipment_no === id),
    [state.transformers, id]
  );

  const history = state.history[id];

  useEffect(() => {
    if (id) loadHistory(id);
  }, [id]);

  if (state.isLoading) return <LoadingSpinner />;

  if (!transformer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Transformer not found</p>
        <Link to="/" className="text-blue-600 text-sm mt-2 inline-block">Back to Fleet</Link>
      </div>
    );
  }

  const riskColor = RISK_COLORS[transformer.risk_level] || RISK_COLORS.Good;

  return (
    <div className="space-y-4">
      {/* Back link + Identity */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <Link
          to={transformer.substation_id ? `/substation/${transformer.substation_id}` : '/'}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2"
        >
          <ArrowLeft className="w-3 h-3" /> Back
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              Transformer {transformer.equipment_no}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{transformer.description}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-gray-500">
              <span>Make: <strong className="text-gray-700">{transformer.make || 'N/A'}</strong></span>
              <span>Voltage: <strong className="text-gray-700">{transformer.voltage_class ? `${transformer.voltage_class} kV` : 'N/A'}</strong></span>
              <span>Capacity: <strong className="text-gray-700">{transformer.capacity_mva ? `${transformer.capacity_mva} MVA` : 'N/A'}</strong></span>
              <span>YOM: <strong className="text-gray-700">{transformer.yom || 'N/A'}</strong></span>
              <span>Age: <strong className="text-gray-700">{transformer.age_years?.toFixed(0) || 'N/A'} years</strong></span>
              <span>Samples: <strong className="text-gray-700">{transformer.sample_count}</strong></span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <RiskBadge level={transformer.risk_level} size="lg" />
            <Link
              to={`/report/${transformer.equipment_no}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors no-print"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Report
            </Link>
          </div>
        </div>
      </div>

      {/* Health Summary — 3 cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* CHI Score */}
        <div className={`rounded-lg border shadow-sm p-4 ${riskColor.light} ${riskColor.border} border`}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Health Index (CHI)</p>
          <p className="text-4xl font-bold mt-2" style={{ color: riskColor.hex }}>
            {transformer.chi?.toFixed(1) || 'N/A'}
          </p>
          <p className="text-sm mt-1" style={{ color: riskColor.hex }}>
            {transformer.risk_level || 'Unknown'}
          </p>
          {transformer.condition_override && (
            <p className="text-[10px] text-purple-600 mt-1 flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Adjusted by {transformer.fault_label} fault diagnosis
            </p>
          )}
          <p className="text-[10px] text-gray-500 mt-2">Scale: 0 (Critical) to 100 (Excellent)</p>
        </div>

        {/* Fault Diagnosis */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fault Diagnosis</p>
          <div className="mt-2">
            <FaultBadge label={transformer.fault_label} />
            <p className="text-xs text-gray-500 mt-2">
              {FAULT_DESCRIPTIONS[transformer.fault_label] || 'Unknown fault type'}
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Confidence:</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${(transformer.confidence || 0) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium">
              {transformer.confidence != null ? `${(transformer.confidence * 100).toFixed(0)}%` : 'N/A'}
            </span>
          </div>
        </div>

        {/* DGAF Score */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">DGA Factor (DGAF)</p>
          <p className="text-4xl font-bold text-gray-900 mt-2">
            {transformer.dgaf?.toFixed(1) || 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Scale: 0 (worst) to 10 (healthy)</p>
          <div className="mt-2 bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: `${((transformer.dgaf || 0) / 10) * 100}%` }}
            />
          </div>
          {transformer.dgaf_rate_penalty != null && transformer.dgaf_rate_penalty < 1.0 && (
            <p className="text-[10px] text-amber-600 mt-1">
              Rate penalty applied: DGAF reduced by {((1 - transformer.dgaf_rate_penalty) * 100).toFixed(0)}%
            </p>
          )}
        </div>
      </div>

      {/* Risk Explanation — WHY this transformer has its rating */}
      <RiskExplanation explanation={transformer.risk_explanation} riskLevel={transformer.risk_level} />

      {/* Diagnosis Methods — with proper explanations */}
      <DiagnosisMethods methods={transformer.methods} />

      {/* Gas Trend Chart */}
      {history ? (
        <GasTrendChart history={history} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <p className="text-sm text-gray-500">Loading gas history...</p>
        </div>
      )}

      {/* Latest Gas Values with IEEE Status */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Latest Gas Values (ppm) &middot; {formatDate(transformer.latest_sample_date)}
        </h3>
        <div className="grid grid-cols-8 gap-3">
          {GAS_COLS.map(gas => {
            const val = transformer.gases?.[gas];
            const status = transformer.gas_status?.[gas];
            const statusColor = !status ? 'text-gray-400' :
              status.status === 1 ? 'text-emerald-600' :
              status.status === 2 ? 'text-amber-600' : 'text-red-600';
            const statusBg = !status ? '' :
              status.status === 1 ? 'bg-emerald-50' :
              status.status === 2 ? 'bg-amber-50' : 'bg-red-50';
            return (
              <div key={gas} className={`text-center rounded-lg p-2 ${statusBg}`}>
                <p className="text-[10px] text-gray-500">{gas}</p>
                <p className={`text-lg font-semibold mt-1 ${val != null ? statusColor : 'text-gray-300'}`}>
                  {formatGas(val)}
                </p>
                {status && (
                  <p className={`text-[9px] mt-0.5 ${statusColor}`}>
                    {status.label}
                  </p>
                )}
              </div>
            );
          })}
          <div className="text-center rounded-lg p-2">
            <p className="text-[10px] text-gray-500">TDCG</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatGas(transformer.tdcg)}
            </p>
          </div>
        </div>
      </div>

      {/* Oil Quality Panel */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Oil Quality (Latest Sample)</h3>
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(OIL_LABELS).map(([key, label]) => {
            const val = transformer.oil_quality?.[key];
            return (
              <div key={key} className="text-center">
                <p className="text-[10px] text-gray-500">{label}</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {val != null ? Number(val).toFixed(1) : 'N/A'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sample History Table (accordion) */}
      {history && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            Sample History ({history.length} samples)
            {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {historyOpen && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-y border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Fault</th>
                    <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">CHI</th>
                    {GAS_COLS.map(g => (
                      <th key={g} className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">{g}</th>
                    ))}
                    <th className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase">TDCG</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...history].reverse().map((sample, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-700">{formatDate(sample.date)}</td>
                      <td className="px-3 py-1.5"><FaultBadge label={sample.fault_label} /></td>
                      <td className="px-3 py-1.5 font-medium">{sample.chi?.toFixed(1) || '-'}</td>
                      {GAS_COLS.map(g => (
                        <td key={g} className="px-2 py-1.5 text-right text-gray-600 font-mono text-xs">
                          {formatGas(sample.gases?.[g])}
                        </td>
                      ))}
                      <td className="px-2 py-1.5 text-right text-gray-600 font-mono text-xs">
                        {formatGas(sample.tdcg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
