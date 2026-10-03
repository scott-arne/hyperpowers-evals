// Builds data/slos.json. Objectives and their remaining error budget this month.
import { sloStatus } from '../analysis/budget.js';

export const snapshot = 'slos';

export async function collect(sources) {
  const records = await sources.prometheus.slos();
  return records.map((r) => ({
    name: r.name,
    service: r.service,
    target: r.target,
    current: r.current,
    budgetLeft: r.budget_left,
    status: sloStatus(r.budget_left),
  }));
}
