// Runs the snapshot jobs once: `node pipeline/run.js [snapshot ...]`. Cron
// starts it every minute; a run that overlaps the previous one exits at once.
import { join } from 'node:path';
import { loadConfig } from '../src/core/config/load.js';
import { createLogger } from '../src/core/log/logger.js';
import { systemClock } from '../src/core/time/clock.js';
import { JOBS } from './jobs/index.js';
import { withLock } from './lib/lock.js';
import { runJob } from './lib/run-job.js';
import { createSources } from './sources/index.js';

const config = loadConfig();
const log = createLogger({ level: config.logLevel, base: { app: 'harbor-pipeline' } });
const wanted = process.argv.slice(2);
const jobs = Object.values(JOBS).filter((job) => wanted.length === 0 || wanted.includes(job.snapshot));

const outcome = await withLock(join(config.dataDir, '.pipeline.lock'), async () => {
  const sources = createSources();
  let failed = 0;
  // Sequential on purpose: several jobs share an upstream, and the rate
  // limits are per client.
  for (const job of jobs) {
    const result = await runJob(job, { sources, clock: systemClock, dataDir: config.dataDir, log });
    if (!result.ok) failed += 1;
  }
  return { failed };
});

if (outcome.skipped) log.warn('previous run still holding the lock; skipping');
else process.exitCode = outcome.value.failed > 0 ? 1 : 0;
