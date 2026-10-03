// Builds data/regions.json. Cloud regions and the provider status for each.
export const snapshot = 'regions';

export async function collect(sources) {
  const records = await sources.inventory.regions();
  return records.map((r) => ({
    name: r.name,
    provider: r.provider,
    services: r.services,
    status: r.status,
  }));
}
