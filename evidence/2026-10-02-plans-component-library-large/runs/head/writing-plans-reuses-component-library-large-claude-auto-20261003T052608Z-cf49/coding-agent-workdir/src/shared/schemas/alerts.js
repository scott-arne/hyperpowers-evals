// data/alerts.json: Firing and recently resolved alerts.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'alerts';

export const fields = {
  name: 'string',
  service: 'string',
  severity: 'string',
  state: 'string',
  firedAt: 'timestamp',
};
