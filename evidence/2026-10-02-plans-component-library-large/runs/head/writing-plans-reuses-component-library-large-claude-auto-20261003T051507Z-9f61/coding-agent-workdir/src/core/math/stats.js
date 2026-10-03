export function mean(values) {
  return values.length === 0 ? NaN : values.reduce((a, b) => a + b, 0) / values.length;
}

// Nearest-rank percentile, the definition the latency SLOs are written in.
export function percentile(values, p) {
  if (values.length === 0) return NaN;
  const ordered = [...values].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * ordered.length);
  return ordered[Math.min(Math.max(rank, 1), ordered.length) - 1];
}

export function median(values) {
  return percentile(values, 50);
}
