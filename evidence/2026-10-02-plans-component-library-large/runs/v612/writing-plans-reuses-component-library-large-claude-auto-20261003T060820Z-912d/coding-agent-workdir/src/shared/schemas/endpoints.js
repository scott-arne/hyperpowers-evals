// data/endpoints.json: Latency and error rate per public endpoint over the last hour.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'endpoints';

export const fields = {
  path: 'string',
  method: 'string',
  service: 'string',
  p95: 'number',
  errorRate: 'string',
  status: 'string',
};
