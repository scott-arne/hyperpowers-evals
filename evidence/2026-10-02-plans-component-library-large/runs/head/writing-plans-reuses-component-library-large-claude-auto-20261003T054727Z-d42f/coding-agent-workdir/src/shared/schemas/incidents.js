// data/incidents.json: Open and recently resolved incidents, newest first.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'incidents';

export const fields = {
  id: 'string',
  title: 'string',
  service: 'string',
  severity: 'string',
  openedAt: 'timestamp',
  resolvedAt: 'timestamp?',
  runbook: 'string',
};
