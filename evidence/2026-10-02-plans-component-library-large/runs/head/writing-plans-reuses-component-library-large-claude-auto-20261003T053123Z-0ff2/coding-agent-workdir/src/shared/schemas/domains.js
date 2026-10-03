// data/domains.json: Registered domains and whether their records resolve.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'domains';

export const fields = {
  name: 'string',
  registrar: 'string',
  expiresAt: 'timestamp',
  dns: 'string',
};
