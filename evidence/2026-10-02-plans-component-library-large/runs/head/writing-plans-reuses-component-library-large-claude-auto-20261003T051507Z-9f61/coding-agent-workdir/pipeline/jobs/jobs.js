// Builds data/jobs.json. Scheduled jobs and the state of their last run.
export const snapshot = 'jobs';

export async function collect(sources) {
  const records = await sources.kubernetes.cronJobs();
  return records.map((r) => ({
    name: r.name,
    schedule: r.schedule,
    lastRun: r.last_run,
    state: r.state,
  }));
}
