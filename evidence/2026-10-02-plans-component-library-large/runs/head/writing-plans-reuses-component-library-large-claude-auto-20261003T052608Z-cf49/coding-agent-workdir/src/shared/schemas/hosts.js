// data/hosts.json: Every host in the inventory with its load average.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'hosts';

export const fields = {
  name: 'string',
  region: 'string',
  role: 'string',
  status: 'string',
  load: 'number',
  upSince: 'timestamp',
};
