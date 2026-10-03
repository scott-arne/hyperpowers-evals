// Builds data/changes.json. Change requests: pull requests on the infra repository labeled "change".
import { riskFromLabels } from '../analysis/risk.js';

export const snapshot = 'changes';

export async function collect(sources) {
  const records = await sources.github.changeRequests();
  return records.map((r) => ({
    id: r.id,
    title: r.title,
    author: r.author,
    risk: riskFromLabels(r.labels),
    state: r.state,
    openedAt: r.opened_at,
  }));
}
