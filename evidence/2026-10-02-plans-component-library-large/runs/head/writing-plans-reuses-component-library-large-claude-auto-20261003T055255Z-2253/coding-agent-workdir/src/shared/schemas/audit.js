// data/audit.json: The audit trail of deploys, rollbacks, config changes and access grants.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'entries';

export const fields = {
  at: 'timestamp',
  actor: 'string',
  action: 'string',
  target: 'string',
  result: 'string',
};
