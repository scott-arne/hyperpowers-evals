// data/tokens.json: API tokens and when they were last used.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'tokens';

export const fields = {
  name: 'string',
  owner: 'string',
  scopes: 'string',
  lastUsed: 'timestamp',
  expiresAt: 'timestamp',
  status: 'string',
};
