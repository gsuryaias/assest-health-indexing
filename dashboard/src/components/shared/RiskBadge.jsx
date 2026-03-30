import { RISK_COLORS } from '../../constants/colors';

export default function RiskBadge({ level, size = 'sm' }) {
  const colors = RISK_COLORS[level] || RISK_COLORS.Good;
  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-medium text-white ${colors.bg} ${sizeClass}`}>
      {level}
    </span>
  );
}
