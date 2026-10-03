// data/capacity.json: Quota usage for each resource pool.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'resources';

export const fields = {
  name: 'string',
  kind: 'string',
  used: 'number',
  total: 'number',
  status: 'string',
};
