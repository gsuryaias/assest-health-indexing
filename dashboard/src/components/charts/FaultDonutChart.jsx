import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { HelpCircle } from 'lucide-react';
import { FAULT_COLORS } from '../../constants/colors';
import { FAULT_DESCRIPTIONS } from '../../constants/thresholds';

export default function FaultDonutChart({ distribution, onSegmentClick, activeSegment }) {
  const [showLegend, setShowLegend] = useState(false);

  const data = Object.entries(distribution)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  const handleClick = (entry) => {
    if (onSegmentClick) {
      onSegmentClick(entry.name);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Fault Distribution
          {activeSegment && (
            <span className="ml-2 text-blue-600 font-semibold normal-case">
              — {activeSegment}: {FAULT_DESCRIPTIONS[activeSegment]}
            </span>
          )}
        </h3>
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="text-gray-400 hover:text-blue-500 transition-colors"
          title="What do D1, T1, etc. mean?"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Fault type legend explanation */}
      {showLegend && (
        <div className="mb-3 bg-gray-50 rounded-lg p-3 text-[10px] text-gray-600 space-y-1">
          <p className="font-medium text-gray-700 text-xs mb-1.5">IEC 60599:2022 Fault Types:</p>
          {Object.entries(FAULT_DESCRIPTIONS).map(([code, desc]) => (
            <div key={code} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: FAULT_COLORS[code] || '#6B7280' }} />
              <span className="font-semibold text-gray-700 w-12">{code}</span>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={showLegend ? 200 : 240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={1}
            dataKey="value"
            onClick={handleClick}
            cursor={onSegmentClick ? 'pointer' : undefined}
          >
            {data.map(entry => (
              <Cell
                key={entry.name}
                fill={FAULT_COLORS[entry.name] || '#6B7280'}
                opacity={activeSegment && activeSegment !== entry.name ? 0.35 : 1}
                stroke={activeSegment === entry.name ? '#1D4ED8' : 'none'}
                strokeWidth={activeSegment === entry.name ? 2 : 0}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${value} (${(value / total * 100).toFixed(1)}%)`,
              `${name} — ${FAULT_DESCRIPTIONS[name] || name}`
            ]}
          />
          <Legend
            iconSize={8}
            wrapperStyle={{ fontSize: '11px', cursor: onSegmentClick ? 'pointer' : 'default' }}
            onClick={(e) => onSegmentClick?.(e.value)}
          />
        </PieChart>
      </ResponsiveContainer>
      {onSegmentClick && (
        <p className="text-[10px] text-gray-400 text-center mt-1">Click a segment to drill down</p>
      )}
    </div>
  );
}
