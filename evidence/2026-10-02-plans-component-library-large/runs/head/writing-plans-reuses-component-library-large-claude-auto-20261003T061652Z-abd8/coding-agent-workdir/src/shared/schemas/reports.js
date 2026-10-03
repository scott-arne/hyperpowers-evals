// data/reports.json: Operations reports from the wiki, newest first.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'reports';

export const fields = {
  id: 'string',
  title: 'string',
  period: 'string',
  owner: 'string',
  publishedAt: 'timestamp',
  state: 'string',
  url: 'string',
};
