// Builds data/hosts.json. Every host in the inventory with its load average.
import { hostStatus } from '../analysis/host-status.js';

export const snapshot = 'hosts';

export async function collect(sources) {
  const records = await sources.inventory.hosts();
  return records.map((r) => ({
    name: r.name,
    region: r.region,
    role: r.role,
    status: hostStatus(r.state),
    load: r.load,
    upSince: r.up_since,
  }));
}
