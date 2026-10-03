// Builds data/queues.json. Queue depths and consumer counts from the broker.
export const snapshot = 'queues';

export async function collect(sources) {
  const records = await sources.rabbitmq.queues();
  return records.map((r) => ({
    name: r.name,
    depth: r.depth,
    consumers: r.consumers,
    oldest: r.oldest,
    status: r.status,
  }));
}
