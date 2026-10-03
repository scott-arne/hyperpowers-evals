// data/vendors.json: Third-party status, polled from each vendor page.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'vendors';

export const fields = {
  name: 'string',
  category: 'string',
  status: 'string',
  checkedAt: 'timestamp',
  statusPage: 'string',
};
