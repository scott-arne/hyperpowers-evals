// PagerDuty priorities to our severities. P4 and P5 page nobody, so they
// count as sev3 here.
export function severityFromPriority(priority) {
  const level = Number(/^P(\d)$/.exec(priority)?.[1]);
  if (!level) throw new Error(`unknown priority: ${priority}`);
  return `sev${Math.min(level, 3)}`;
}
