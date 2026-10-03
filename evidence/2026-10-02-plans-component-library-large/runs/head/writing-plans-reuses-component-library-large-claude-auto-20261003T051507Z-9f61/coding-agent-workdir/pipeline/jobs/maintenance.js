// Builds data/maintenance.json. Scheduled maintenance windows from the status page.
export const snapshot = 'maintenance';

export async function collect(sources) {
  const records = await sources.statuspage.maintenances();
  return records.map((r) => ({
    id: r.id,
    title: r.title,
    service: r.service,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    state: r.state,
  }));
}
