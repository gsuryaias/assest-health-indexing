import { useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { ArrowLeft, Printer } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { RISK_COLORS, GAS_COLORS, FAULT_COLORS } from '../constants/colors';
import { IEEE_THRESHOLDS, FAULT_DESCRIPTIONS } from '../constants/thresholds';
import { formatDate, formatGas } from '../utils/formatters';

const GAS_COLS = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2', 'CO', 'CO2'];
const OIL_LABELS = {
  BDV: 'BDV (kV)',
  MOISTURE: 'Moisture (ppm)',
  RESISTIVITY: 'Resistivity',
  TAN_DELTA: 'Tan Delta',
  ACIDITY: 'Acidity',
};

export default function Report() {
  const { id } = useParams();
  const { state, loadHistory } = useDashboard();

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
  const today = new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const gasAlerts = transformer.risk_explanation?.gas_alerts || [];
  const oilAlerts = transformer.risk_explanation?.oil_alerts || [];
  const methods = transformer.methods || [];
  const methodsWithResults = methods.filter(m => m.result);
  const methodsWithout = methods.filter(m => !m.result);

  // Gas trend chart data
  const chartData = history
    ? history.map(s => ({ date: s.date, ...s.gases }))
    : [];
  const maxVal = chartData.reduce((max, row) => {
    GAS_COLS.forEach(g => {
      if (row[g] != null) max = Math.max(max, row[g]);
    });
    return max;
  }, 0);

  return (
    <div className="report-page max-w-4xl mx-auto">
      {/* No-print toolbar */}
      <div className="no-print flex items-center justify-between mb-4">
        <Link
          to={`/transformer/${id}`}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Transformer
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>

      {/* ===== Section 1: Header ===== */}
      <div className="report-section border-b-2 border-gray-900 pb-4 mb-6">
        <h1 className="text-xl font-bold text-gray-900 print:text-black">
          AP Transco — Transformer Condition Assessment Report
        </h1>
        <p className="text-sm text-gray-500 mt-1 print:text-gray-600">
          Generated on {today}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Equipment No:</span>{' '}
            <strong className="text-gray-900">{transformer.equipment_no}</strong>
          </div>
          <div>
            <span className="text-gray-500">Description:</span>{' '}
            <strong className="text-gray-900">{transformer.description || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-gray-500">Substation:</span>{' '}
            <strong className="text-gray-900">{transformer.substation_name || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-gray-500">Manufacturer:</span>{' '}
            <strong className="text-gray-900">{transformer.make || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-gray-500">Capacity:</span>{' '}
            <strong className="text-gray-900">{transformer.capacity_mva ? `${transformer.capacity_mva} MVA` : 'N/A'}</strong>
          </div>
          <div>
            <span className="text-gray-500">Voltage:</span>{' '}
            <strong className="text-gray-900">{transformer.voltage_class ? `${transformer.voltage_class} kV` : 'N/A'}</strong>
          </div>
          <div>
            <span className="text-gray-500">Year of Manufacture:</span>{' '}
            <strong className="text-gray-900">{transformer.yom || 'N/A'}</strong>
          </div>
          <div>
            <span className="text-gray-500">Age:</span>{' '}
            <strong className="text-gray-900">{transformer.age_years?.toFixed(0) || 'N/A'} years</strong>
          </div>
          <div>
            <span className="text-gray-500">Samples on Record:</span>{' '}
            <strong className="text-gray-900">{transformer.sample_count || 'N/A'}</strong>
          </div>
        </div>
      </div>

      {/* ===== Section 2: Executive Summary ===== */}
      <div className="report-section mb-6 page-break-inside-avoid">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Executive Summary
        </h2>
        <div
          className="border-2 rounded-lg p-4 print:border-gray-400"
          style={{ borderColor: riskColor.hex }}
        >
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-medium">Health Index (CHI)</p>
              <p className="text-3xl font-bold mt-1" style={{ color: riskColor.hex }}>
                {transformer.chi?.toFixed(1) || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">out of 100</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-medium">Risk Level</p>
              <p className="text-lg font-bold mt-2" style={{ color: riskColor.hex }}>
                {transformer.risk_level || 'Unknown'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-medium">Fault Diagnosis</p>
              <p className="text-lg font-bold mt-2" style={{ color: FAULT_COLORS[transformer.fault_label] || '#6B7280' }}>
                {transformer.fault_label || 'N/A'}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                {FAULT_DESCRIPTIONS[transformer.fault_label] || ''}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase font-medium">Confidence</p>
              <p className="text-lg font-bold mt-2 text-gray-900">
                {transformer.confidence != null
                  ? `${(transformer.confidence * 100).toFixed(0)}%`
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Section 3: Risk Assessment ===== */}
      <div className="report-section mb-6 page-break-inside-avoid">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Risk Assessment
        </h2>
        {gasAlerts.length === 0 && oilAlerts.length === 0 ? (
          <p className="text-sm text-gray-600">
            All gas concentrations and oil quality parameters are within normal limits per
            IEEE C57.104-2019 and IEC 60422 standards.
          </p>
        ) : (
          <div className="space-y-2">
            {gasAlerts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Gas Alerts</h3>
                <ul className="space-y-1">
                  {gasAlerts.map((a, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span>
                        <strong>{a.msg}</strong>
                        <span className="text-gray-500 ml-1">
                          ({a.severity === 'high' ? 'IEEE Status 3 — Active fault' : 'IEEE Status 2 — Incipient fault'})
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {oilAlerts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Oil Quality Alerts</h3>
                <ul className="space-y-1">
                  {oilAlerts.map((a, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.severity === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span>
                        <strong>{a.msg}</strong>
                        <span className="text-gray-500 ml-1">(Oil quality per IEC 60422)</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Section 4: Latest Gas Values ===== */}
      <div className="report-section mb-6 page-break-inside-avoid">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Latest Gas Values (ppm) — {formatDate(transformer.latest_sample_date)}
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 print:bg-gray-100">
              <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Gas</th>
              <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Value (ppm)</th>
              <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Status 1 Limit</th>
              <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Status 2 Limit</th>
              <th className="border border-gray-300 px-3 py-1.5 text-center font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {GAS_COLS.map(gas => {
              const val = transformer.gases?.[gas];
              const status = transformer.gas_status?.[gas];
              const thresholds = IEEE_THRESHOLDS[gas] || [];
              return (
                <tr key={gas}>
                  <td className="border border-gray-300 px-3 py-1.5 font-medium">{gas}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right font-mono">
                    {formatGas(val)}
                  </td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right text-gray-500">
                    {thresholds[0] ?? '-'}
                  </td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right text-gray-500">
                    {thresholds[1] ?? '-'}
                  </td>
                  <td className="border border-gray-300 px-3 py-1.5 text-center">
                    {status ? (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        status.status === 1 ? 'bg-emerald-100 text-emerald-800 print:text-emerald-800' :
                        status.status === 2 ? 'bg-amber-100 text-amber-800 print:text-amber-800' :
                        'bg-red-100 text-red-800 print:text-red-800'
                      }`}>
                        {status.label}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50">
              <td className="border border-gray-300 px-3 py-1.5 font-medium">TDCG</td>
              <td className="border border-gray-300 px-3 py-1.5 text-right font-mono">
                {formatGas(transformer.tdcg)}
              </td>
              <td className="border border-gray-300 px-3 py-1.5 text-right text-gray-500">
                {IEEE_THRESHOLDS.TDCG?.[0] ?? '-'}
              </td>
              <td className="border border-gray-300 px-3 py-1.5 text-right text-gray-500">
                {IEEE_THRESHOLDS.TDCG?.[1] ?? '-'}
              </td>
              <td className="border border-gray-300 px-3 py-1.5 text-center text-gray-400">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== Section 5: Oil Quality ===== */}
      <div className="report-section mb-6 page-break-inside-avoid">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Oil Quality (Latest Sample)
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 print:bg-gray-100">
              <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Parameter</th>
              <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(OIL_LABELS).map(([key, label]) => {
              const val = transformer.oil_quality?.[key];
              return (
                <tr key={key}>
                  <td className="border border-gray-300 px-3 py-1.5">{label}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right font-mono">
                    {val != null ? Number(val).toFixed(2) : 'N/A'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== Section 6: Diagnosis Methods ===== */}
      <div className="report-section mb-6 page-break-inside-avoid">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Diagnosis Methods ({methodsWithResults.length}/{methods.length} applied)
        </h2>
        {methodsWithResults.length > 0 && (
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Methods Applied</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-100">
                  <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Method</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Reference</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {methodsWithResults.map(m => (
                  <tr key={m.key}>
                    <td className="border border-gray-300 px-3 py-1.5 font-medium">{m.name}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-gray-500 text-xs">{m.ref}</td>
                    <td className="border border-gray-300 px-3 py-1.5">
                      <span
                        className="inline-block px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: FAULT_COLORS[m.result] || '#6B7280' }}
                      >
                        {m.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {methodsWithout.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-1">Methods Not Applied</h3>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-100">
                  <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Method</th>
                  <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {methodsWithout.map(m => (
                  <tr key={m.key}>
                    <td className="border border-gray-300 px-3 py-1.5 text-gray-500">{m.name}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-gray-500 text-xs">
                      {m.missing_gases?.length > 0
                        ? `Missing gas data: ${m.missing_gases.join(', ')} (requires: ${m.required_gases?.join(', ')})`
                        : 'Gas ratios did not match any known fault pattern'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== Section 7: Gas Trend Chart ===== */}
      {history && history.length > 0 && (
        <div className="report-section mb-6 page-break-before">
          <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
            Gas Concentration Trends
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9 }}
                tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
              />
              <YAxis tick={{ fontSize: 9 }} domain={[0, Math.max(maxVal * 1.1, 10)]} />
              <Tooltip
                labelFormatter={formatDate}
                formatter={(val, name) => [val?.toFixed(1) + ' ppm', name]}
              />
              {GAS_COLS.filter(g => g !== 'CO2').map(gas => (
                <Line
                  key={gas}
                  type="monotone"
                  dataKey={gas}
                  stroke={GAS_COLORS[gas]}
                  strokeWidth={1.5}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))}
              {GAS_COLS.filter(g => g !== 'CO2').map(gas => {
                const th = IEEE_THRESHOLDS[gas];
                if (!th || th[0] > maxVal * 1.5) return null;
                return (
                  <ReferenceLine
                    key={`th-${gas}`}
                    y={th[0]}
                    stroke={GAS_COLORS[gas]}
                    strokeDasharray="5 3"
                    strokeOpacity={0.4}
                    label={{ value: `${gas} S1`, fontSize: 8, fill: GAS_COLORS[gas] }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-gray-400 mt-1">
            Dashed lines indicate IEEE C57.104-2019 Status 1 thresholds. CO2 omitted from chart for scale.
          </p>
        </div>
      )}

      {/* ===== Section 8: Sample History ===== */}
      {history && history.length > 0 && (
        <div className="report-section mb-6 page-break-before">
          <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
            Sample History ({history.length} samples)
          </h2>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left font-medium">Date</th>
                <th className="border border-gray-300 px-2 py-1 text-left font-medium">Fault</th>
                <th className="border border-gray-300 px-2 py-1 text-right font-medium">CHI</th>
                {GAS_COLS.map(g => (
                  <th key={g} className="border border-gray-300 px-2 py-1 text-right font-medium">{g}</th>
                ))}
                <th className="border border-gray-300 px-2 py-1 text-right font-medium">TDCG</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((sample, i) => (
                <tr key={i}>
                  <td className="border border-gray-300 px-2 py-1">{formatDate(sample.date)}</td>
                  <td className="border border-gray-300 px-2 py-1">
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                      style={{ backgroundColor: FAULT_COLORS[sample.fault_label] || '#6B7280' }}
                    >
                      {sample.fault_label}
                    </span>
                  </td>
                  <td className="border border-gray-300 px-2 py-1 text-right font-mono">
                    {sample.chi?.toFixed(1) || '-'}
                  </td>
                  {GAS_COLS.map(g => (
                    <td key={g} className="border border-gray-300 px-2 py-1 text-right font-mono">
                      {formatGas(sample.gases?.[g])}
                    </td>
                  ))}
                  <td className="border border-gray-300 px-2 py-1 text-right font-mono">
                    {formatGas(sample.tdcg)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Section 9: Methodology Note ===== */}
      <div className="report-section mb-6 page-break-inside-avoid">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Methodology
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          This assessment uses dissolved gas analysis (DGA) methods from IEEE C57.104-2019, IEC 60599,
          and peer-reviewed literature including the Duval Triangle, Duval Pentagon, Rogers Ratios,
          and the Key Gas method. The Composite Health Index (CHI) is computed using an XGBoost
          classification model trained on AP Transco's fleet data, combining gas concentrations, oil
          quality parameters, equipment age, and historical trends. Oil quality thresholds follow
          IEC 60422. Risk levels map to CHI ranges: Excellent (80-100), Good (60-80), Fair (40-60),
          Poor (20-40), Critical (0-20). Confidence scores reflect classification probability from
          the ensemble model.
        </p>
      </div>

      {/* ===== Section 10: Footer ===== */}
      <div className="report-section border-t-2 border-gray-900 pt-3 mt-8 text-center">
        <p className="text-xs text-gray-500">
          Generated by AP Transco DGA Dashboard — Phase A Local Analysis
        </p>
        <p className="text-[10px] text-gray-400 mt-1">
          IEEE C57.104-2019 | IEC 60599 | IEC 60422
        </p>
      </div>
    </div>
  );
}
