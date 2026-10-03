// The billing export reports cents; the costs page shows whole dollars.
export function dollars(cents) {
  return `$${Math.round(cents / 100)}`;
}

export function spendStatus(spentCents, budgetCents) {
  if (spentCents > budgetCents) return 'over';
  return spentCents > budgetCents * 0.9 ? 'near' : 'under';
}
