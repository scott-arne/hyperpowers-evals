// Builds data/alerts.json. Firing and recently resolved alerts.
export const snapshot = 'alerts';

export async function collect(sources) {
  const records = await sources.alertmanager.alerts();
  return records.map((r) => ({
    name: r.name,
    service: r.service,
    severity: r.severity,
    state: r.state,
    firedAt: r.fired_at,
  }));
}
