// Builds data/clusters.json. Kubernetes clusters and their control-plane versions.
export const snapshot = 'clusters';

export async function collect(sources) {
  const records = await sources.kubernetes.clusters();
  return records.map((r) => ({
    name: r.name,
    region: r.region,
    version: r.version,
    nodes: r.nodes,
    status: r.status,
  }));
}
