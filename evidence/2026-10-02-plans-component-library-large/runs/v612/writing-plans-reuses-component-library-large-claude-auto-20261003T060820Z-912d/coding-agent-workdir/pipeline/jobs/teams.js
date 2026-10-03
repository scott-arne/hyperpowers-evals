// Builds data/teams.json. Teams, their leads and their on-call rotation size.
import { staffingFor } from '../analysis/staffing.js';

export const snapshot = 'teams';

export async function collect(sources) {
  const records = await sources.github.teams();
  return records.map((r) => ({
    name: r.name,
    area: r.area,
    lead: r.lead,
    members: r.members,
    channel: r.channel,
    staffing: staffingFor(r.rotation_size),
  }));
}
