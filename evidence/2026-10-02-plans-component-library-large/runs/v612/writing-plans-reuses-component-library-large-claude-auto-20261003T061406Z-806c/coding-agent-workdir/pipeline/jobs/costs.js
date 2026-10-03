// Builds data/costs.json. Month-to-date spend against each service budget.
import { dollars, spendStatus } from '../analysis/spend.js';

export const snapshot = 'costs';

export async function collect(sources) {
  const records = await sources.billing.budgets();
  return records.map((r) => ({
    service: r.service,
    team: r.team,
    budget: dollars(r.budget_cents),
    spent: dollars(r.spent_cents),
    status: spendStatus(r.spent_cents, r.budget_cents),
  }));
}
