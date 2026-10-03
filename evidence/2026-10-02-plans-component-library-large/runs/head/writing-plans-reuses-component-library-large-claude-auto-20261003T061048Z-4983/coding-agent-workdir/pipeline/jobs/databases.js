// Builds data/databases.json. Database instances from the fleet API.
export const snapshot = 'databases';

export async function collect(sources) {
  const records = await sources.postgres.instances();
  return records.map((r) => ({
    name: r.name,
    engine: r.engine,
    version: r.version,
    size: r.size,
    replicas: r.replicas,
    status: r.status,
  }));
}
