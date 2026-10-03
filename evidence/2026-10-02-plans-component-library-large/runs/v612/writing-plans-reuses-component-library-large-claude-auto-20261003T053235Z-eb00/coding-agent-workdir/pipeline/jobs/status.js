// Builds data/status.json. Our public status page components.
export const snapshot = 'status';

export async function collect(sources) {
  const records = await sources.statuspage.components();
  return records.map((r) => ({
    name: r.name,
    group: r.group,
    state: r.state,
  }));
}
