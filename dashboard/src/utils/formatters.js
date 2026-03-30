export function formatNumber(val, decimals = 0) {
  if (val == null || isNaN(val)) return 'N/A';
  return Number(val).toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatPct(val) {
  if (val == null || isNaN(val)) return 'N/A';
  return `${(val * 100).toFixed(1)}%`;
}

export function formatGas(val) {
  if (val == null) return '-';
  return Number(val).toFixed(1);
}

export function chiToRisk(chi) {
  if (chi == null) return null;
  if (chi >= 80) return 'Excellent';
  if (chi >= 60) return 'Good';
  if (chi >= 40) return 'Fair';
  if (chi >= 20) return 'Poor';
  return 'Critical';
}
