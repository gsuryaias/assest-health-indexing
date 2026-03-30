import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { GAS_COLORS } from '../../constants/colors';
import { IEEE_THRESHOLDS } from '../../constants/thresholds';
import { formatDate } from '../../utils/formatters';

const ALL_GASES = ['H2', 'CH4', 'C2H6', 'C2H4', 'C2H2', 'CO', 'CO2'];

export default function GasTrendChart({ history }) {
  const [visibleGases, setVisibleGases] = useState(
    new Set(['H2', 'CH4', 'C2H4', 'C2H2'])
  );
  const [showThresholds, setShowThresholds] = useState(true);

  const data = history.map(s => ({
    date: s.date,
    ...s.gases,
  }));

  const toggleGas = (gas) => {
    setVisibleGases(prev => {
      const next = new Set(prev);
      if (next.has(gas)) next.delete(gas);
      else next.add(gas);
      return next;
    });
  };

  // Find max value for visible gases to set Y domain
  const maxVal = data.reduce((max, row) => {
    ALL_GASES.forEach(g => {
      if (visibleGases.has(g) && row[g] != null) max = Math.max(max, row[g]);
    });
    return max;
  }, 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gas Concentration Trends</h3>
        <label className="flex items-center gap-1.5 text-[10px] text-gray-500">
          <input
            type="checkbox"
            checked={showThresholds}
            onChange={e => setShowThresholds(e.target.checked)}
            className="rounded text-blue-500 w-3 h-3"
          />
          IEEE Thresholds
        </label>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {ALL_GASES.map(gas => (
          <button
            key={gas}
            onClick={() => toggleGas(gas)}
            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
              visibleGases.has(gas)
                ? 'text-white border-transparent'
                : 'text-gray-400 border-gray-200 bg-white'
            }`}
            style={visibleGases.has(gas) ? { backgroundColor: GAS_COLORS[gas] } : {}}
          >
            {gas}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            tickFormatter={d => new Date(d).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
          />
          <YAxis tick={{ fontSize: 10 }} domain={[0, Math.max(maxVal * 1.1, 10)]} />
          <Tooltip
            labelFormatter={formatDate}
            formatter={(val, name) => [val?.toFixed(1) + ' ppm', name]}
          />
          {ALL_GASES.map(gas =>
            visibleGases.has(gas) && (
              <Line
                key={gas}
                type="monotone"
                dataKey={gas}
                stroke={GAS_COLORS[gas]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls
              />
            )
          )}
          {showThresholds && ALL_GASES.map(gas => {
            if (!visibleGases.has(gas)) return null;
            const th = IEEE_THRESHOLDS[gas];
            if (!th || th[0] > maxVal * 1.5) return null;
            return (
              <ReferenceLine
                key={`th-${gas}`}
                y={th[0]}
                stroke={GAS_COLORS[gas]}
                strokeDasharray="5 3"
                strokeOpacity={0.5}
                label={{ value: `${gas} S1`, fontSize: 9, fill: GAS_COLORS[gas] }}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
