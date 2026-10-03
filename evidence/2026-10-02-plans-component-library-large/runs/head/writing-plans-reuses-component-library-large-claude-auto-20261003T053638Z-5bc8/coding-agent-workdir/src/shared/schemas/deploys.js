// data/deploys.json: The last 50 deploys from the CI system, newest first.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'deploys';

export const fields = {
  id: 'string',
  service: 'string',
  version: 'string',
  environment: 'string',
  status: 'string',
  startedAt: 'timestamp',
  finishedAt: 'timestamp?',
  author: 'string',
};
