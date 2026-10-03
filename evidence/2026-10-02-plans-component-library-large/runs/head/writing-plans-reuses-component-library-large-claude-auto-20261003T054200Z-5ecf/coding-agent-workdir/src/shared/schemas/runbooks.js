// data/runbooks.json: Runbooks from the wiki, by label.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'runbooks';

export const fields = {
  id: 'string',
  title: 'string',
  summary: 'string',
  url: 'string',
};
