import { RISK_COLORS, RISK_ORDER } from '../../constants/colors';

export default function RiskDistributionBar({ distribution, onSegmentClick }) {
  const total = Object.values(distribution).reduce((s, v) => s + v, 0);
  if (!total) return null;

  const ordered = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Risk Distribution</h3>
      <div className="flex rounded-lg overflow-hidden h-8">
        {ordered.map(level => {
          const count = distribution[level] || 0;
          if (!count) return null;
          const pct = (count / total * 100);
          return (
            <button
              key={level}
              className={`${RISK_COLORS[level].bg} hover:opacity-90 transition-opacity relative group`}
              style={{ width: `${pct}%` }}
              onClick={() => onSegmentClick?.(level)}
              title={`${level}: ${count} (${pct.toFixed(1)}%)`}
            >
              {pct > 8 && (
                <span className="text-[10px] text-white font-medium">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2">
        {ordered.map(level => {
          const count = distribution[level] || 0;
          if (!count) return null;
          return (
            <div key={level} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${RISK_COLORS[level].bg}`} />
              <span className="text-[10px] text-gray-500">{level} ({count})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
