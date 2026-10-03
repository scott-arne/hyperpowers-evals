// data/databases.json: Database instances from the fleet API.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'databases';

export const fields = {
  name: 'string',
  engine: 'string',
  version: 'string',
  size: 'string',
  replicas: 'number',
  status: 'string',
};
