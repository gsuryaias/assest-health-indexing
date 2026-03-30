import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function FeatureImportanceChart({ features, title, color = '#3B82F6' }) {
  if (!features?.length) return null;

  const data = features.slice(0, 15).map(([name, imp]) => ({
    name: name.length > 25 ? name.slice(0, 22) + '...' : name,
    fullName: name,
    importance: Number(imp),
  })).reverse();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {title || 'Top Features'}
      </h3>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 28, 200)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 120 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
          <XAxis type="number" tick={{ fontSize: 10 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={115} />
          <Tooltip
            formatter={(val) => [val.toFixed(4), 'Importance']}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName}
          />
          <Bar dataKey="importance" fill={color} radius={[0, 3, 3, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
