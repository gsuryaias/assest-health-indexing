import { useNavigate } from 'react-router-dom';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { RISK_COLORS } from '../../constants/colors';

export default function AgeHealthScatter({ transformers }) {
  const navigate = useNavigate();

  const data = transformers
    .filter(t => t.age_years != null && t.age_years >= 0 && t.chi != null)
    .map(t => ({
      age: t.age_years,
      chi: t.chi,
      risk: t.risk_level,
      id: t.equipment_no,
      fill: RISK_COLORS[t.risk_level]?.hex || '#6B7280',
    }));

  const riskGroups = {};
  data.forEach(d => {
    if (!riskGroups[d.risk]) riskGroups[d.risk] = [];
    riskGroups[d.risk].push(d);
  });

  const handleDotClick = (point) => {
    if (point?.id) {
      navigate(`/transformer/${point.id}`);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        Age vs Health Index
        <span className="ml-2 text-[10px] text-gray-400 normal-case font-normal">click a dot to view transformer</span>
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="age" name="Age" unit=" yrs" type="number" tick={{ fontSize: 10 }} />
          <YAxis dataKey="chi" name="CHI" domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            content={({ payload }) => {
              if (!payload?.[0]) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-gray-200 rounded p-2 shadow-lg text-xs">
                  <p className="font-medium">{d.id}</p>
                  <p>Age: {d.age?.toFixed(1)} yrs</p>
                  <p>CHI: {d.chi?.toFixed(1)}</p>
                  <p>Risk: {d.risk}</p>
                  <p className="text-blue-500 mt-1">Click to view details</p>
                </div>
              );
            }}
          />
          {Object.entries(riskGroups).map(([risk, points]) => (
            <Scatter
              key={risk}
              name={risk}
              data={points}
              fill={RISK_COLORS[risk]?.hex || '#6B7280'}
              opacity={0.6}
              r={3}
              cursor="pointer"
              onClick={handleDotClick}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
