import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, Download } from 'lucide-react';
import RiskBadge from '../shared/RiskBadge';
import FaultBadge from '../shared/FaultBadge';
import { formatDate, formatGas } from '../../utils/formatters';
import { exportCsv } from '../../utils/exportCsv';
import { buildShortReason, buildRiskReason } from '../../utils/riskReason';

export default function TransformerTable({ transformers }) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState('chi');
  const [sortAsc, setSortAsc] = useState(true);

  const riskOrder = { Critical: 0, Poor: 1, Fair: 2, Good: 3, Excellent: 4 };

  const sorted = [...transformers].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'equipment_no': cmp = (a.equipment_no || '').localeCompare(b.equipment_no || ''); break;
      case 'substation_name': cmp = (a.substation_name || '').localeCompare(b.substation_name || ''); break;
      case 'description': cmp = (a.description || '').localeCompare(b.description || ''); break;
      case 'capacity_mva': cmp = (a.capacity_mva || 0) - (b.capacity_mva || 0); break;
      case 'age_years': cmp = (a.age_years || 0) - (b.age_years || 0); break;
      case 'chi': cmp = (a.chi || 0) - (b.chi || 0); break;
      case 'risk_level': cmp = (riskOrder[a.risk_level] ?? 5) - (riskOrder[b.risk_level] ?? 5); break;
      case 'fault_label': cmp = (a.fault_label || '').localeCompare(b.fault_label || ''); break;
      default: cmp = 0;
    }
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortHeader = ({ label, field }) => (
    <th
      className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none"
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
      { key: 'equipment_no', label: 'Equipment No' },
      { key: (r) => r.substation_name || r.substation_id || '', label: 'Substation' },
      { key: 'description', label: 'Description' },
      { key: 'make', label: 'Make' },
      { key: 'capacity_mva', label: 'MVA' },
      { key: (r) => r.age_years != null ? r.age_years.toFixed(0) : '', label: 'Age' },
      { key: 'fault_label', label: 'Fault' },
      { key: (r) => r.chi != null ? r.chi.toFixed(1) : '', label: 'CHI' },
      { key: 'risk_level', label: 'Risk' },
      { key: (r) => buildRiskReason(r), label: 'Reason for Risk Rating' },
      { key: (r) => r.latest_sample_date || '', label: 'Last Sampled' },
    ], 'transformers_export.csv');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{transformers.length} transformers</span>
        <button onClick={handleExport} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 bg-white border border-gray-200 rounded-md px-2 py-1 transition-colors" title="Export as CSV">
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortHeader label="Equipment" field="equipment_no" />
              <SortHeader label="Substation" field="substation_name" />
              <SortHeader label="Make" field="make" />
              <SortHeader label="MVA" field="capacity_mva" />
              <SortHeader label="Age" field="age_years" />
              <SortHeader label="Fault" field="fault_label" />
              <SortHeader label="CHI" field="chi" />
              <SortHeader label="Risk" field="risk_level" />
              <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wide">Reason</th>
              <SortHeader label="Last Sampled" field="latest_sample_date" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(tr => (
              <tr
                key={tr.equipment_no}
                className="hover:bg-blue-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/transformer/${tr.equipment_no}`)}
              >
                <td className="px-3 py-2 text-sm font-mono text-gray-900">{tr.equipment_no}</td>
                <td className="px-3 py-2 text-sm text-gray-600 max-w-[180px] truncate" title={tr.substation_name || tr.substation_id || ''}>{tr.substation_name || tr.substation_id || '-'}</td>
                <td className="px-3 py-2 text-sm text-gray-600">{tr.make || '-'}</td>
                <td className="px-3 py-2 text-sm text-gray-600">{tr.capacity_mva || '-'}</td>
                <td className="px-3 py-2 text-sm text-gray-600">
                  {tr.age_years != null ? `${tr.age_years.toFixed(0)}y` : '-'}
                </td>
                <td className="px-3 py-2"><FaultBadge label={tr.fault_label} /></td>
                <td className="px-3 py-2 text-sm font-medium text-gray-900">
                  {tr.chi != null ? tr.chi.toFixed(1) : '-'}
                </td>
                <td className="px-3 py-2"><RiskBadge level={tr.risk_level} /></td>
                <td className="px-3 py-2 text-[11px] text-gray-500 max-w-[220px] truncate" title={buildRiskReason(tr)}>
                  {buildShortReason(tr)}
                </td>
                <td className="px-3 py-2 text-sm text-gray-500">{formatDate(tr.latest_sample_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        <span>{transformers.length} transformers</span>
      </div>
    </div>
  );
}
