// Builds data/webhooks.json. Outgoing webhook subscriptions and their last delivery.
export const snapshot = 'webhooks';

export async function collect(sources) {
  const records = await sources.inventory.webhooks();
  return records.map((r) => ({
    name: r.name,
    url: r.url,
    events: r.events,
    lastDelivery: r.last_delivery,
    status: r.status,
  }));
}
