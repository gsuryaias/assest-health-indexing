import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Download } from 'lucide-react';
import RiskBadge from '../shared/RiskBadge';
import { formatNumber, formatDate } from '../../utils/formatters';
import { exportCsv } from '../../utils/exportCsv';

export default function SubstationTable({ substations }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('worst_risk');
  const [sortAsc, setSortAsc] = useState(true);

  const riskOrder = { Critical: 0, Poor: 1, Fair: 2, Good: 3, Excellent: 4 };

  const sorted = [...substations].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name': cmp = (a.name || '').localeCompare(b.name || ''); break;
      case 'transformer_count': cmp = (a.transformer_count || 0) - (b.transformer_count || 0); break;
      case 'avg_chi': cmp = (a.avg_chi || 0) - (b.avg_chi || 0); break;
      case 'worst_risk': cmp = (riskOrder[a.worst_risk] ?? 5) - (riskOrder[b.worst_risk] ?? 5); break;
      case 'latest_sample_date': cmp = (a.latest_sample_date || '').localeCompare(b.latest_sample_date || ''); break;
      default: cmp = 0;
    }
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, field, className = '' }) => (
    <th
      className={`px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none ${className}`}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </span>
    </th>
  );

  const handleExport = () => {
    exportCsv(sorted, [
      { key: 'name', label: 'Substation Name' },
      { key: 'id', label: 'ID' },
      { key: (r) => r.voltage_class ? `${r.voltage_class} kV` : '', label: 'Voltage' },
      { key: 'transformer_count', label: 'Transformer Count' },
      { key: (r) => r.avg_chi != null ? r.avg_chi.toFixed(1) : '', label: 'Avg CHI' },
      { key: 'worst_risk', label: 'Worst Risk' },
      { key: (r) => r.latest_sample_date || '', label: 'Last Sampled' },
    ], 'substations_export.csv');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{substations.length} substations</span>
        <button onClick={handleExport} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 bg-white border border-gray-200 rounded-md px-2 py-1 transition-colors" title="Export as CSV">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortHeader label="Substation" field="name" />
              <SortHeader label="Voltage" field="voltage_class" />
              <SortHeader label="Transformers" field="transformer_count" />
              <SortHeader label="Avg CHI" field="avg_chi" />
              <SortHeader label="Worst Risk" field="worst_risk" />
              <SortHeader label="Last Sampled" field="latest_sample_date" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(sub => (
              <tr
                key={sub.id}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/substation/${sub.id}`)}
              >
                <td className="px-3 py-2.5 text-sm text-gray-900 font-medium max-w-xs truncate">
                  {sub.name}
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-600">
                  {sub.voltage_class ? `${sub.voltage_class} kV` : '-'}
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-600">{sub.transformer_count}</td>
                <td className="px-3 py-2.5 text-sm text-gray-600">
                  {sub.avg_chi != null ? sub.avg_chi.toFixed(1) : '-'}
                </td>
                <td className="px-3 py-2.5">
                  <RiskBadge level={sub.worst_risk} />
                </td>
                <td className="px-3 py-2.5 text-sm text-gray-500">
                  {formatDate(sub.latest_sample_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <span>{substations.length} substations</span>
      </div>
    </div>
  );
}
