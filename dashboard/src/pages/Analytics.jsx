import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, Legend, PieChart, Pie, LineChart, Line,
} from 'recharts';
import { Factory, Zap, Clock, TrendingDown, Download } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import TransformerListPanel from '../components/shared/TransformerListPanel';
import { RISK_COLORS, FAULT_COLORS } from '../constants/colors';
import { exportCsv } from '../utils/exportCsv';

function SectionCard({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-4 h-4 text-blue-500" />}
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-[10px] text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function MakeAnalysis({ transformers }) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState('count');
  const [selectedMake, setSelectedMake] = useState(null);

  // Build a lookup of make -> transformer[] for the drill-down
  const makeUnitsMap = useMemo(() => {
    const map = {};
    transformers.forEach(t => {
      const make = t.make || 'Unknown';
      if (!map[make]) map[make] = [];
      map[make].push(t);
    });
    return map;
  }, [transformers]);

  const makeData = useMemo(() => {
    const byMake = {};
    transformers.forEach(t => {
      const make = t.make || 'Unknown';
      if (!byMake[make]) byMake[make] = { make, units: [], totalChi: 0, chiCount: 0, faults: 0, risks: {} };
      byMake[make].units.push(t);
      if (t.chi != null) { byMake[make].totalChi += t.chi; byMake[make].chiCount++; }
      if (t.fault_label !== 'Normal') byMake[make].faults++;
      const r = t.risk_level || 'Unknown';
      byMake[make].risks[r] = (byMake[make].risks[r] || 0) + 1;
    });

    return Object.values(byMake)
      .filter(m => m.units.length >= 5) // only show makes with 5+ units
      .map(m => ({
        make: m.make,
        count: m.units.length,
        avgChi: m.chiCount ? +(m.totalChi / m.chiCount).toFixed(1) : null,
        faultRate: +((m.faults / m.units.length) * 100).toFixed(1),
        poorCount: (m.risks.Poor || 0) + (m.risks.Critical || 0),
        excellentPct: m.risks.Excellent ? +((m.risks.Excellent / m.units.length) * 100).toFixed(0) : 0,
        avgAge: +(m.units.reduce((s, t) => s + (t.age_years > 0 ? t.age_years : 0), 0) / m.units.length).toFixed(1),
      }))
      .sort((a, b) => {
        if (sortBy === 'count') return b.count - a.count;
        if (sortBy === 'chi') return (a.avgChi || 100) - (b.avgChi || 100);
        if (sortBy === 'fault') return b.faultRate - a.faultRate;
        if (sortBy === 'poor') return b.poorCount - a.poorCount;
        return 0;
      });
  }, [transformers, sortBy]);

  const chartData = makeData.slice(0, 20);

  const handleBarClick = (data) => {
    if (data?.make) {
      setSelectedMake(selectedMake === data.make ? null : data.make);
    }
  };

  const handleRowClick = (makeName) => {
    setSelectedMake(selectedMake === makeName ? null : makeName);
  };

  return (
    <SectionCard title="Manufacturer Performance" subtitle={`${makeData.length} manufacturers with 5+ units`} icon={Factory}>
      <div className="flex gap-2 mb-3">
        {[
          { key: 'count', label: 'By Fleet Size' },
          { key: 'chi', label: 'By Health (worst first)' },
          { key: 'fault', label: 'By Fault Rate' },
          { key: 'poor', label: 'By Poor/Critical' },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => setSortBy(s.key)}
            className={`text-[10px] px-2 py-1 rounded-full border ${
              sortBy === s.key ? 'bg-blue-500 text-white border-blue-500' : 'text-gray-500 border-gray-200 hover:border-blue-300'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={Math.max(chartData.length * 28, 200)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, bottom: 0, left: 100 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="make" tick={{ fontSize: 10 }} width={95} />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-xs">
                  <p className="font-semibold text-gray-900">{d.make}</p>
                  <p className="text-gray-600">{d.count} units &middot; Avg age {d.avgAge}y</p>
                  <p className="text-gray-600">Avg CHI: <strong>{d.avgChi}</strong></p>
                  <p className="text-gray-600">Fault rate: <strong>{d.faultRate}%</strong></p>
                  <p className="text-gray-600">Poor/Critical: <strong>{d.poorCount}</strong></p>
                  <p className="text-gray-600">Excellent: <strong>{d.excellentPct}%</strong></p>
                  <p className="text-blue-500 mt-1">Click to view transformers</p>
                </div>
              );
            }}
          />
          <Bar dataKey={sortBy === 'chi' ? 'avgChi' : sortBy === 'fault' ? 'faultRate' : sortBy === 'poor' ? 'poorCount' : 'count'}
               radius={[0, 3, 3, 0]} barSize={16}
               cursor="pointer"
               onClick={handleBarClick}>
            {chartData.map((entry, i) => (
              <Cell key={i}
                fill={
                  sortBy === 'chi' ? (entry.avgChi >= 80 ? '#10B981' : entry.avgChi >= 60 ? '#3B82F6' : entry.avgChi >= 40 ? '#F59E0B' : '#EF4444') :
                  sortBy === 'fault' ? (entry.faultRate > 40 ? '#EF4444' : entry.faultRate > 25 ? '#F59E0B' : '#3B82F6') :
                  sortBy === 'poor' ? (entry.poorCount > 3 ? '#EF4444' : entry.poorCount > 0 ? '#F97316' : '#10B981') :
                  '#3B82F6'
                }
                opacity={selectedMake && selectedMake !== entry.make ? 0.35 : 1}
                stroke={selectedMake === entry.make ? '#1D4ED8' : 'none'}
                strokeWidth={selectedMake === entry.make ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Inline drill-down panel for selected manufacturer */}
      {selectedMake && makeUnitsMap[selectedMake] && (
        <TransformerListPanel
          transformers={makeUnitsMap[selectedMake]}
          title={`Manufacturer: ${selectedMake}`}
          onClose={() => setSelectedMake(null)}
        />
      )}

      {/* Table below */}
      <div className="mt-4 overflow-x-auto">
        <div className="flex items-center justify-end mb-1">
          <button
            onClick={() => exportCsv(makeData, [
              { key: 'make', label: 'Manufacturer' },
              { key: 'count', label: 'Units' },
              { key: 'avgChi', label: 'Avg CHI' },
              { key: (r) => r.faultRate + '%', label: 'Fault Rate' },
              { key: 'poorCount', label: 'Poor/Critical' },
              { key: (r) => r.excellentPct + '%', label: '% Excellent' },
              { key: (r) => r.avgAge + 'y', label: 'Avg Age' },
            ], 'manufacturer_performance.csv')}
            className="flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors"
            title="Export manufacturer data as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[10px]">CSV</span>
          </button>
        </div>
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Manufacturer</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Units</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Avg CHI</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Fault Rate</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Poor/Crit</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">% Excellent</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Avg Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {makeData.map(d => (
              <tr key={d.make}
                  className={`cursor-pointer transition-colors ${
                    selectedMake === d.make ? 'bg-blue-100 hover:bg-blue-100' : 'hover:bg-blue-50'
                  }`}
                  onClick={() => handleRowClick(d.make)}>
                <td className="px-2 py-1.5 font-medium text-gray-800">{d.make}</td>
                <td className="px-2 py-1.5 text-right">{d.count}</td>
                <td className={`px-2 py-1.5 text-right font-medium ${
                  d.avgChi >= 80 ? 'text-emerald-600' : d.avgChi >= 60 ? 'text-blue-600' : d.avgChi >= 40 ? 'text-amber-600' : 'text-red-600'
                }`}>{d.avgChi}</td>
                <td className={`px-2 py-1.5 text-right ${d.faultRate > 40 ? 'text-red-600 font-medium' : d.faultRate > 25 ? 'text-amber-600' : ''}`}>
                  {d.faultRate}%
                </td>
                <td className={`px-2 py-1.5 text-right ${d.poorCount > 0 ? 'text-orange-600 font-medium' : ''}`}>{d.poorCount}</td>
                <td className="px-2 py-1.5 text-right">{d.excellentPct}%</td>
                <td className="px-2 py-1.5 text-right text-gray-500">{d.avgAge}y</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function VoltageAnalysis({ transformers }) {
  const [selectedVoltage, setSelectedVoltage] = useState(null);

  const voltageData = useMemo(() => {
    const byVoltage = {};
    transformers.forEach(t => {
      const v = t.voltage_class;
      if (!v) return;
      if (!byVoltage[v]) byVoltage[v] = { voltage: `${v} kV`, rawVoltage: v, units: 0, totalChi: 0, chiCount: 0, faults: {}, risks: {} };
      byVoltage[v].units++;
      if (t.chi != null) { byVoltage[v].totalChi += t.chi; byVoltage[v].chiCount++; }
      const f = t.fault_label || 'Normal';
      byVoltage[v].faults[f] = (byVoltage[v].faults[f] || 0) + 1;
      const r = t.risk_level || 'Unknown';
      byVoltage[v].risks[r] = (byVoltage[v].risks[r] || 0) + 1;
    });
    return Object.values(byVoltage).map(v => ({
      ...v,
      avgChi: v.chiCount ? +(v.totalChi / v.chiCount).toFixed(1) : null,
      faultRate: +(((v.units - (v.faults.Normal || 0)) / v.units) * 100).toFixed(1),
    })).sort((a, b) => parseInt(a.voltage) - parseInt(b.voltage));
  }, [transformers]);

  // Transformers matching the selected voltage class
  const voltageFilteredTransformers = useMemo(() => {
    if (!selectedVoltage) return [];
    return transformers.filter(t => t.voltage_class === selectedVoltage);
  }, [selectedVoltage, transformers]);

  const handleVoltageClick = (rawVoltage) => {
    setSelectedVoltage(selectedVoltage === rawVoltage ? null : rawVoltage);
  };

  return (
    <SectionCard title="Voltage Class Comparison" subtitle="Click a card to see transformers" icon={Zap}>
      <div className="grid grid-cols-3 gap-4">
        {voltageData.map(v => (
          <div key={v.voltage}
               className={`border rounded-lg p-3 cursor-pointer transition-all ${
                 selectedVoltage === v.rawVoltage
                   ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/30'
                   : 'border-gray-100 hover:border-blue-300 hover:shadow-sm'
               }`}
               onClick={() => handleVoltageClick(v.rawVoltage)}>
            <p className="text-lg font-bold text-gray-900">{v.voltage}</p>
            <p className="text-xs text-gray-500">{v.units} transformers</p>
            <div className="mt-2 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Avg CHI</span>
                <span className={`font-medium ${v.avgChi >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{v.avgChi}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Fault Rate</span>
                <span className={`font-medium ${v.faultRate > 30 ? 'text-red-600' : 'text-gray-700'}`}>{v.faultRate}%</span>
              </div>
              <div className="mt-2">
                <p className="text-[10px] text-gray-400 mb-1">Risk breakdown</p>
                <div className="flex rounded overflow-hidden h-4">
                  {['Excellent', 'Good', 'Fair', 'Poor', 'Critical'].map(level => {
                    const count = v.risks[level] || 0;
                    if (!count) return null;
                    const pct = (count / v.units) * 100;
                    return (
                      <div key={level} className={`${RISK_COLORS[level].bg}`}
                           style={{ width: `${pct}%` }}
                           title={`${level}: ${count} (${pct.toFixed(0)}%)`} />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Inline drill-down panel for selected voltage class */}
      {selectedVoltage && (
        <TransformerListPanel
          transformers={voltageFilteredTransformers}
          title={`${selectedVoltage} kV transformers`}
          onClose={() => setSelectedVoltage(null)}
        />
      )}
    </SectionCard>
  );
}

function AgingAnalysis({ transformers }) {
  const [selectedBucket, setSelectedBucket] = useState(null);

  const buckets = [
    { label: '0-5y', min: 0, max: 5 },
    { label: '5-10y', min: 5, max: 10 },
    { label: '10-15y', min: 10, max: 15 },
    { label: '15-20y', min: 15, max: 20 },
    { label: '20-25y', min: 20, max: 25 },
    { label: '25-30y', min: 25, max: 30 },
    { label: '30+y', min: 30, max: 999 },
  ];

  const ageData = useMemo(() => {
    return buckets.map(b => {
      const units = transformers.filter(t => t.age_years != null && t.age_years >= b.min && t.age_years < b.max);
      const chis = units.filter(u => u.chi != null).map(u => u.chi);
      const faults = units.filter(u => u.fault_label !== 'Normal').length;
      return {
        age: b.label,
        min: b.min,
        max: b.max,
        count: units.length,
        avgChi: chis.length ? +(chis.reduce((s, v) => s + v, 0) / chis.length).toFixed(1) : null,
        faultRate: units.length ? +((faults / units.length) * 100).toFixed(1) : 0,
        poorCount: units.filter(u => u.risk_level === 'Poor' || u.risk_level === 'Critical').length,
      };
    });
  }, [transformers]);

  // Transformers matching the selected age bucket
  const bucketFilteredTransformers = useMemo(() => {
    if (!selectedBucket) return [];
    const bucket = buckets.find(b => b.label === selectedBucket);
    if (!bucket) return [];
    return transformers.filter(t => t.age_years != null && t.age_years >= bucket.min && t.age_years < bucket.max);
  }, [selectedBucket, transformers]);

  const handleBarClick = (data) => {
    if (data?.age) {
      setSelectedBucket(selectedBucket === data.age ? null : data.age);
    }
  };

  return (
    <SectionCard title="Age-Based Analysis" subtitle="Click a bar to see transformers in that range" icon={Clock}>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={ageData} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="age" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} domain={[0, 100]} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
          <Tooltip
            content={({ payload, label }) => {
              if (!payload?.length) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-lg text-xs">
                  <p className="font-semibold">{label}</p>
                  <p>{d.count} transformers</p>
                  <p>Avg CHI: <strong>{d.avgChi}</strong></p>
                  <p>Fault rate: <strong>{d.faultRate}%</strong></p>
                  <p>Poor/Critical: <strong>{d.poorCount}</strong></p>
                  <p className="text-blue-500 mt-1">Click to view transformers</p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar yAxisId="left" dataKey="avgChi" name="Avg Health Index" fill="#3B82F6" radius={[3, 3, 0, 0]} barSize={24}
               cursor="pointer" onClick={handleBarClick}>
            {ageData.map((entry, i) => (
              <Cell key={`chi-${i}`}
                fill="#3B82F6"
                opacity={selectedBucket && selectedBucket !== entry.age ? 0.35 : 1}
                stroke={selectedBucket === entry.age ? '#1D4ED8' : 'none'}
                strokeWidth={selectedBucket === entry.age ? 2 : 0}
              />
            ))}
          </Bar>
          <Bar yAxisId="right" dataKey="faultRate" name="Fault Rate %" fill="#F59E0B" radius={[3, 3, 0, 0]} barSize={24}
               cursor="pointer" onClick={handleBarClick}>
            {ageData.map((entry, i) => (
              <Cell key={`fr-${i}`}
                fill="#F59E0B"
                opacity={selectedBucket && selectedBucket !== entry.age ? 0.35 : 1}
                stroke={selectedBucket === entry.age ? '#92400E' : 'none'}
                strokeWidth={selectedBucket === entry.age ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Inline drill-down panel for selected age bucket */}
      {selectedBucket && (
        <TransformerListPanel
          transformers={bucketFilteredTransformers}
          title={`Age range: ${selectedBucket}`}
          onClose={() => setSelectedBucket(null)}
        />
      )}
    </SectionCard>
  );
}

function WorstPerformers({ transformers }) {
  const navigate = useNavigate();
  const worst = useMemo(() => {
    return [...transformers]
      .filter(t => t.chi != null)
      .sort((a, b) => a.chi - b.chi)
      .slice(0, 15);
  }, [transformers]);

  return (
    <SectionCard title="Transformers Requiring Attention" subtitle="Lowest 15 by Health Index" icon={TrendingDown}>
      <div className="flex items-center justify-end mb-1">
        <button
          onClick={() => exportCsv(worst, [
            { key: 'equipment_no', label: 'Equipment' },
            { key: 'substation_name', label: 'Substation' },
            { key: 'make', label: 'Make' },
            { key: 'voltage_class', label: 'kV' },
            { key: (r) => r.age_years?.toFixed(0) || '', label: 'Age' },
            { key: (r) => r.chi?.toFixed(1) || '', label: 'CHI' },
            { key: 'risk_level', label: 'Risk' },
            { key: 'fault_label', label: 'Fault' },
          ], 'worst_performers.csv')}
          className="flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors"
          title="Export worst performers as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="text-[10px]">CSV</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Equipment</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Substation</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Make</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">kV</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">Age</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">CHI</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Risk</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Fault</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {worst.map(t => (
              <tr key={t.equipment_no}
                  className="hover:bg-blue-50 cursor-pointer"
                  onClick={() => navigate(`/transformer/${t.equipment_no}`)}>
                <td className="px-2 py-1.5 font-mono font-medium">{t.equipment_no}</td>
                <td className="px-2 py-1.5 text-gray-600 max-w-[150px] truncate">{t.substation_name || '-'}</td>
                <td className="px-2 py-1.5 text-gray-600">{t.make || '-'}</td>
                <td className="px-2 py-1.5 text-right">{t.voltage_class || '-'}</td>
                <td className="px-2 py-1.5 text-right">{t.age_years?.toFixed(0) || '-'}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${
                  t.chi < 40 ? 'text-red-600' : t.chi < 60 ? 'text-amber-600' : 'text-blue-600'
                }`}>{t.chi?.toFixed(1)}</td>
                <td className="px-2 py-1.5">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white ${RISK_COLORS[t.risk_level]?.bg || 'bg-gray-400'}`}>
                    {t.risk_level}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                        style={{ backgroundColor: FAULT_COLORS[t.fault_label] || '#6B7280' }}>
                    {t.fault_label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export default function Analytics() {
  const { state } = useDashboard();
  const { transformers, isLoading } = state;

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Fleet Analytics</h1>
        <p className="text-sm text-gray-500">Cross-cutting analysis by manufacturer, voltage class, age, and performance</p>
      </div>

      <MakeAnalysis transformers={transformers} />

      <div className="grid grid-cols-2 gap-5">
        <VoltageAnalysis transformers={transformers} />
        <AgingAnalysis transformers={transformers} />
      </div>

      <WorstPerformers transformers={transformers} />
    </div>
  );
}
