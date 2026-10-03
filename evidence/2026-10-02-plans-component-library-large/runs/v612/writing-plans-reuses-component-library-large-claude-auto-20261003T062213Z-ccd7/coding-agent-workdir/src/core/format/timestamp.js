// Snapshot times are UTC; showing them in UTC keeps the on-call handoff notes
// and the dashboard in agreement.
export function formatTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)} UTC`;
}
