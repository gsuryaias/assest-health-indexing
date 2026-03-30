export default function KPICard({ label, value, subtitle, icon: Icon, color = 'text-slate-600', onClick, active }) {
  const clickable = !!onClick;
  return (
    <div
      className={`bg-white rounded-lg border shadow-sm p-4 transition-all ${
        active ? 'border-blue-500 ring-2 ring-blue-100' :
        clickable ? 'border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer' :
        'border-gray-200'
      }`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${color}`} />}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
