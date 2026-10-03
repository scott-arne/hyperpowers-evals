// Error budget left, in percent of the month's budget. Below a quarter the
// owning team stops risky deploys.
export function sloStatus(budgetLeft) {
  if (budgetLeft < 0) return 'breached';
  return budgetLeft < 25 ? 'at-risk' : 'met';
}
