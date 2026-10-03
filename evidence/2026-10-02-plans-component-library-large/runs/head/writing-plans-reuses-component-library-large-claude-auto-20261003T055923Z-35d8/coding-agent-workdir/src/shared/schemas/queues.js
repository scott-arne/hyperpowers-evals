// data/queues.json: Queue depths and consumer counts from the broker.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'queues';

export const fields = {
  name: 'string',
  depth: 'number',
  consumers: 'number',
  oldest: 'string',
  status: 'string',
};
