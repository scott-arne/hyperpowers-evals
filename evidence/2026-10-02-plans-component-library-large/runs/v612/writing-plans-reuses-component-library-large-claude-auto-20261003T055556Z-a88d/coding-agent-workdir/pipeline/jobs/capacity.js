// Builds data/capacity.json. Quota usage for each resource pool.
import { capacityStatus } from '../analysis/capacity.js';

export const snapshot = 'capacity';

export async function collect(sources) {
  const records = await sources.aws.quotas();
  return records.map((r) => ({
    name: r.name,
    kind: r.kind,
    used: r.used,
    total: r.total,
    status: capacityStatus(r.used, r.total),
  }));
}
