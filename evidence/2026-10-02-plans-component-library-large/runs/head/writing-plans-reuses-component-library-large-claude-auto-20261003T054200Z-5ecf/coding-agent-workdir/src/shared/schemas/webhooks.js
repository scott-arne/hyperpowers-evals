// data/webhooks.json: Outgoing webhook subscriptions and their last delivery.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'webhooks';

export const fields = {
  name: 'string',
  url: 'string',
  events: 'string',
  lastDelivery: 'timestamp',
  status: 'string',
};
