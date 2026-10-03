// Builds data/deploys.json. The last 50 deploys from the CI system, newest first.
export const snapshot = 'deploys';

export async function collect(sources) {
  const records = await sources.ci.deploys();
  return records.map((r) => ({
    id: r.id,
    service: r.service,
    version: r.version,
    environment: r.environment,
    status: r.status,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    author: r.author,
  }));
}
