// Builds data/endpoints.json. Latency and error rate per public endpoint over the last hour.
export const snapshot = 'endpoints';

export async function collect(sources) {
  const records = await sources.prometheus.endpoints();
  return records.map((r) => ({
    path: r.path,
    method: r.method,
    service: r.service,
    p95: r.p95,
    errorRate: r.error_rate,
    status: r.status,
  }));
}
