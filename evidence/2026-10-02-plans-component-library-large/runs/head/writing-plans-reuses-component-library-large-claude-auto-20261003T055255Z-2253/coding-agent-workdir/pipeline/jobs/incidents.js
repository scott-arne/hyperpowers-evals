// Builds data/incidents.json. Open and recently resolved incidents, newest first.
import { severityFromPriority } from '../analysis/severity.js';

export const snapshot = 'incidents';

export async function collect(sources) {
  const records = await sources.pagerduty.incidents();
  return records.map((r) => ({
    id: r.id,
    title: r.title,
    service: r.service,
    severity: severityFromPriority(r.priority),
    openedAt: r.opened_at,
    resolvedAt: r.resolved_at,
    runbook: r.runbook,
  }));
}
