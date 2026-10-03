// data/maintenance.json: Scheduled maintenance windows from the status page.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'windows';

export const fields = {
  id: 'string',
  title: 'string',
  service: 'string',
  startsAt: 'timestamp',
  endsAt: 'timestamp',
  state: 'string',
};
