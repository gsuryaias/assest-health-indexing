import { FAULT_COLORS } from '../../constants/colors';

export default function FaultBadge({ label }) {
  const color = FAULT_COLORS[label] || '#6B7280';
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
