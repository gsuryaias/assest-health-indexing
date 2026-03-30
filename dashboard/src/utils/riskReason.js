/**
 * Build a human-readable reason for a transformer's risk rating.
 * Uses risk_explanation from the preprocessed JSON data.
 */
export function buildRiskReason(t) {
  const reasons = [];
  const exp = t?.risk_explanation || {};

  // Condition Group override (CIGRE TB 761)
  if (t?.condition_override) {
    reasons.push(`Risk adjusted by ${t.fault_label || 'diagnosed'} fault (CIGRE TB 761 Condition Group)`);
  }

  // Rate-of-change penalty (Paper 5)
  if (t?.dgaf_rate_penalty != null && t.dgaf_rate_penalty < 1.0) {
    const pct = ((1 - t.dgaf_rate_penalty) * 100).toFixed(0);
    reasons.push(`DGAF reduced by ${pct}% due to rapid gas changes`);
  }

  for (const alert of (exp.gas_alerts || [])) {
    reasons.push(alert.msg);
  }
  for (const alert of (exp.oil_alerts || [])) {
    reasons.push(alert.msg);
  }

  if (reasons.length === 0) {
    const risk = t?.risk_level;
    if (risk === 'Excellent') return 'All parameters within normal limits';
    if (risk === 'Good') return 'Minor deviations; within acceptable range';
    return 'Marginal values across multiple parameters';
  }

  return reasons.join('; ');
}

export function buildShortReason(t) {
  const full = buildRiskReason(t);
  if (full.length <= 60) return full;
  const parts = full.split(';');
  const first = parts[0].trim();
  if (parts.length > 1) return first + ` (+${parts.length - 1} more)`;
  return first.slice(0, 57) + '...';
}
