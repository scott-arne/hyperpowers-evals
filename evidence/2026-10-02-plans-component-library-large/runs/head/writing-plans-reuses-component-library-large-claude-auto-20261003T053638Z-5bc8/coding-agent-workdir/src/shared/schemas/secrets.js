// data/secrets.json: Secret rotation dates. Values never leave Vault.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'secrets';

export const fields = {
  name: 'string',
  store: 'string',
  rotatedAt: 'timestamp',
  rotateBy: 'timestamp',
  status: 'string',
};
