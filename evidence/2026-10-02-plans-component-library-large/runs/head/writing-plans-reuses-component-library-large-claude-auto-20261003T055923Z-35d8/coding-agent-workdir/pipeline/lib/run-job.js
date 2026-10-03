import { SCHEMAS } from '../../src/shared/schemas/index.js';
import { formatSnapshot, snapshotTime } from './format-snapshot.js';
import { validateRows } from './validate.js';
import { writeSnapshot } from './write-snapshot.js';

// Collects, validates and writes one snapshot. Never throws: a failed job is
// logged and reported, and the other jobs still run.
export async function runJob(job, { sources, clock, dataDir, log, write = writeSnapshot }) {
  const started = clock.now();
  const { key, fields } = SCHEMAS[job.snapshot];
  try {
    const rows = await job.collect(sources, { now: started });
    validateRows(job.snapshot, rows, fields);
    const extra = job.extras ? await job.extras(sources) : {};
    await write(dataDir, job.snapshot, formatSnapshot({ generatedAt: snapshotTime(started), key, rows, extra }));
    log.info('snapshot written', { snapshot: job.snapshot, rows: rows.length, ms: clock.now() - started });
    return { ok: true, rows: rows.length };
  } catch (error) {
    log.error('snapshot failed', { snapshot: job.snapshot, error: error.message, problems: error.problems });
    return { ok: false, error };
  }
}
