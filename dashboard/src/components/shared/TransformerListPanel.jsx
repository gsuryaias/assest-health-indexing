import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { RISK_COLORS, FAULT_COLORS } from '../../constants/colors';

/**
 * Reusable drill-down panel that shows a filtered list of transformers.
 * Each row navigates to /transformer/:id on click.
 *
 * Props:
 *  - transformers: array of transformer objects to display
 *  - title: string heading for the panel
 *  - onClose: callback to collapse/hide the panel
 */
export default function TransformerListPanel({ transformers, title, onClose }) {
  const navigate = useNavigate();

  if (!transformers || transformers.length === 0) return null;

  return (
    <div className="mt-3 border border-blue-200 bg-blue-50/40 rounded-lg overflow-hidden animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-50 border-b border-blue-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-blue-800">{title}</span>
          <span className="text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full font-medium">
            {transformers.length} transformer{transformers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-blue-100 text-blue-500 transition-colors"
          title="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="max-h-[280px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-white/60 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Equipment</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Substation</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Make</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">kV</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500">CHI</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Risk</th>
              <th className="px-2 py-1.5 text-left font-medium text-gray-500">Fault</th>
              <th className="px-2 py-1.5 text-right font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-100">
            {transformers.map(t => (
              <tr
                key={t.equipment_no}
                className="hover:bg-blue-100/60 cursor-pointer transition-colors"
                onClick={() => navigate(`/transformer/${t.equipment_no}`)}
              >
                <td className="px-2 py-1.5 font-mono font-medium text-gray-800">{t.equipment_no}</td>
                <td className="px-2 py-1.5 text-gray-600 max-w-[150px] truncate">{t.substation_name || '-'}</td>
                <td className="px-2 py-1.5 text-gray-600">{t.make || '-'}</td>
                <td className="px-2 py-1.5 text-right text-gray-600">{t.voltage_class || '-'}</td>
                <td className={`px-2 py-1.5 text-right font-bold ${
                  t.chi < 40 ? 'text-red-600' : t.chi < 60 ? 'text-amber-600' : t.chi < 80 ? 'text-blue-600' : 'text-emerald-600'
                }`}>{t.chi?.toFixed(1) ?? '-'}</td>
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
                <td className="px-2 py-1.5 text-right">
                  <ChevronRight className="w-3 h-3 text-gray-400 inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
