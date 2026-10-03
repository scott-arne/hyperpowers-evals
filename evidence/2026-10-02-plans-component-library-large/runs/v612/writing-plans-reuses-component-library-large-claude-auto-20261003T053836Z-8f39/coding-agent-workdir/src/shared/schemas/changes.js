// data/changes.json: Change requests: pull requests on the infra repository labeled "change".
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'changes';

export const fields = {
  id: 'string',
  title: 'string',
  author: 'string',
  risk: 'string',
  state: 'string',
  openedAt: 'timestamp',
};
