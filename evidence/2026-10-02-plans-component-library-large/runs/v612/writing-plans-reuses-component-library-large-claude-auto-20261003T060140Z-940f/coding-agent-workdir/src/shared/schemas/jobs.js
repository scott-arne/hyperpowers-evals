// data/jobs.json: Scheduled jobs and the state of their last run.
// Checked by the pipeline before it writes the file, and by tools/verify.
export const key = 'jobs';

export const fields = {
  name: 'string',
  schedule: 'string',
  lastRun: 'timestamp',
  state: 'string',
};
