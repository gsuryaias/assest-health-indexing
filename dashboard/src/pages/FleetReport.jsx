import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { RISK_COLORS, FAULT_COLORS } from '../constants/colors';
import { RISK_ORDER } from '../constants/colors';

export default function FleetReport() {
  const { state } = useDashboard();
  const { fleet, substations, transformers, isLoading } = state;

  const today = new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  // Risk distribution table data
  const riskData = useMemo(() => {
    if (!fleet?.risk_distribution) return [];
    return RISK_ORDER.map(level => ({
      level,
      count: fleet.risk_distribution[level] || 0,
      pct: fleet.total_transformers
        ? (((fleet.risk_distribution[level] || 0) / fleet.total_transformers) * 100).toFixed(1)
        : '0.0',
    }));
  }, [fleet]);

  // Fault distribution table data
  const faultData = useMemo(() => {
    if (!fleet?.fault_distribution) return [];
    return Object.entries(fleet.fault_distribution)
      .map(([type, count]) => ({
        type,
        count,
        pct: fleet.total_transformers
          ? ((count / fleet.total_transformers) * 100).toFixed(1)
          : '0.0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [fleet]);

  // Bottom 20 transformers by CHI
  const topConcerns = useMemo(() => {
    return [...(transformers || [])]
      .filter(t => t.chi != null)
      .sort((a, b) => a.chi - b.chi)
      .slice(0, 20);
  }, [transformers]);

  // Manufacturer summary (10+ units)
  const makeData = useMemo(() => {
    const byMake = {};
    (transformers || []).forEach(t => {
      const make = t.make || 'Unknown';
      if (!byMake[make]) byMake[make] = { make, units: 0, totalChi: 0, chiCount: 0, faults: 0 };
      byMake[make].units++;
      if (t.chi != null) { byMake[make].totalChi += t.chi; byMake[make].chiCount++; }
      if (t.fault_label !== 'Normal') byMake[make].faults++;
    });

    return Object.values(byMake)
      .filter(m => m.units >= 10)
      .map(m => ({
        make: m.make,
        count: m.units,
        avgChi: m.chiCount ? (m.totalChi / m.chiCount).toFixed(1) : 'N/A',
        faultRate: ((m.faults / m.units) * 100).toFixed(1),
      }))
      .sort((a, b) => b.count - a.count);
  }, [transformers]);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="report-page max-w-4xl mx-auto">
      {/* No-print toolbar */}
      <div className="no-print flex items-center justify-between mb-4">
        <Link
          to="/"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Fleet Overview
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
          AP Transco — Fleet Health Summary Report
        </h1>
        <p className="text-sm text-gray-500 mt-1 print:text-gray-600">
          Generated on {today}
        </p>
      </div>

      {/* ===== Section 2: KPIs ===== */}
      <div className="report-section mb-6 page-break-inside-avoid">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Fleet Overview
        </h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="border border-gray-300 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase font-medium">Total Transformers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {fleet?.total_transformers || 0}
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase font-medium">Substations</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {fleet?.total_substations || substations?.length || 0}
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase font-medium">Average CHI</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {fleet?.avg_chi?.toFixed(1) || 'N/A'}
            </p>
          </div>
          <div className="border border-gray-300 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500 uppercase font-medium">Needs Attention</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {(fleet?.risk_distribution?.Critical || 0) + (fleet?.risk_distribution?.Poor || 0)}
            </p>
            <p className="text-[10px] text-gray-500">Critical + Poor</p>
          </div>
        </div>
      </div>

      {/* ===== Section 3: Risk Distribution ===== */}
      <div className="report-section mb-6 page-break-inside-avoid">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Risk Distribution
        </h2>
        {/* Visual bar */}
        <div className="flex rounded overflow-hidden h-6 mb-3">
          {riskData.map(r => {
            if (r.count === 0) return null;
            const pctWidth = fleet?.total_transformers
              ? (r.count / fleet.total_transformers) * 100
              : 0;
            return (
              <div
                key={r.level}
                className={`${RISK_COLORS[r.level]?.bg || 'bg-gray-400'} flex items-center justify-center text-white text-[10px] font-medium`}
                style={{ width: `${pctWidth}%` }}
                title={`${r.level}: ${r.count}`}
              >
                {pctWidth > 8 ? `${r.level} (${r.count})` : ''}
              </div>
            );
          })}
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 print:bg-gray-100">
              <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Risk Level</th>
              <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Count</th>
              <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {riskData.map(r => (
              <tr key={r.level}>
                <td className="border border-gray-300 px-3 py-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                    style={{ backgroundColor: RISK_COLORS[r.level]?.hex || '#6B7280' }}
                  />
                  {r.level}
                </td>
                <td className="border border-gray-300 px-3 py-1.5 text-right font-medium">{r.count}</td>
                <td className="border border-gray-300 px-3 py-1.5 text-right">{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Section 4: Fault Distribution ===== */}
      <div className="report-section mb-6 page-break-inside-avoid">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Fault Distribution
        </h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100 print:bg-gray-100">
              <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Fault Type</th>
              <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Count</th>
              <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {faultData.map(f => (
              <tr key={f.type}>
                <td className="border border-gray-300 px-3 py-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                    style={{ backgroundColor: FAULT_COLORS[f.type] || '#6B7280' }}
                  />
                  {f.type}
                </td>
                <td className="border border-gray-300 px-3 py-1.5 text-right font-medium">{f.count}</td>
                <td className="border border-gray-300 px-3 py-1.5 text-right">{f.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Section 5: Top Concerns ===== */}
      <div className="report-section mb-6 page-break-before">
        <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
          Top Concerns — Bottom 20 Transformers by Health Index
        </h2>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-gray-100 print:bg-gray-100">
              <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">Equipment</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">Substation</th>
              <th className="border border-gray-300 px-2 py-1.5 text-left font-medium">Make</th>
              <th className="border border-gray-300 px-2 py-1.5 text-right font-medium">CHI</th>
              <th className="border border-gray-300 px-2 py-1.5 text-center font-medium">Risk</th>
              <th className="border border-gray-300 px-2 py-1.5 text-center font-medium">Fault</th>
            </tr>
          </thead>
          <tbody>
            {topConcerns.map(t => (
              <tr key={t.equipment_no}>
                <td className="border border-gray-300 px-2 py-1 font-mono font-medium">{t.equipment_no}</td>
                <td className="border border-gray-300 px-2 py-1 max-w-[160px] truncate">{t.substation_name || '-'}</td>
                <td className="border border-gray-300 px-2 py-1">{t.make || '-'}</td>
                <td className={`border border-gray-300 px-2 py-1 text-right font-bold ${
                  t.chi < 40 ? 'text-red-600' : t.chi < 60 ? 'text-amber-600' : 'text-blue-600'
                }`}>
                  {t.chi?.toFixed(1)}
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: RISK_COLORS[t.risk_level]?.hex || '#6B7280' }}
                  >
                    {t.risk_level}
                  </span>
                </td>
                <td className="border border-gray-300 px-2 py-1 text-center">
                  <span
                    className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                    style={{ backgroundColor: FAULT_COLORS[t.fault_label] || '#6B7280' }}
                  >
                    {t.fault_label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Section 6: Manufacturer Summary ===== */}
      {makeData.length > 0 && (
        <div className="report-section mb-6 page-break-inside-avoid">
          <h2 className="text-base font-bold text-gray-900 mb-3 border-b border-gray-300 pb-1">
            Manufacturer Summary (10+ units)
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 print:bg-gray-100">
                <th className="border border-gray-300 px-3 py-1.5 text-left font-medium">Manufacturer</th>
                <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Units</th>
                <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Avg CHI</th>
                <th className="border border-gray-300 px-3 py-1.5 text-right font-medium">Fault Rate</th>
              </tr>
            </thead>
            <tbody>
              {makeData.map(m => (
                <tr key={m.make}>
                  <td className="border border-gray-300 px-3 py-1.5 font-medium">{m.make}</td>
                  <td className="border border-gray-300 px-3 py-1.5 text-right">{m.count}</td>
                  <td className={`border border-gray-300 px-3 py-1.5 text-right font-medium ${
                    m.avgChi >= 80 ? 'text-emerald-600' :
                    m.avgChi >= 60 ? 'text-blue-600' :
                    m.avgChi >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {m.avgChi}
                  </td>
                  <td className={`border border-gray-300 px-3 py-1.5 text-right ${
                    m.faultRate > 40 ? 'text-red-600 font-medium' :
                    m.faultRate > 25 ? 'text-amber-600' : ''
                  }`}>
                    {m.faultRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== Section 7: Footer ===== */}
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
