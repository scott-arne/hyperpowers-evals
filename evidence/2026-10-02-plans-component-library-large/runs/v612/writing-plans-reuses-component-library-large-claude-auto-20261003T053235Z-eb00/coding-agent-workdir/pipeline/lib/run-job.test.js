import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixedClock } from '../../src/core/time/clock.js';
import { runJob } from './run-job.js';

const quiet = { info() {}, error() {} };
const clock = fixedClock(Date.parse('2026-10-01T09:30:00Z'));

test('writes a valid snapshot', async () => {
  const written = [];
  const job = { snapshot: 'runbooks', collect: async () => [{ id: 'reindex', title: 'Search reindex', summary: 'Rebuild it.', url: 'https://wiki.example.com/runbooks/reindex' }] };
  const result = await runJob(job, { sources: {}, clock, dataDir: '/data', log: quiet, write: async (...args) => written.push(args) });
  assert.deepEqual(result, { ok: true, rows: 1 });
  assert.equal(written[0][1], 'runbooks');
  assert.match(written[0][2], /"generatedAt": "2026-10-01T09:30:00Z"/);
});

test('keeps the old snapshot when the rows are invalid', async () => {
  const written = [];
  const job = { snapshot: 'runbooks', collect: async () => [{ id: 'reindex' }] };
  const result = await runJob(job, { sources: {}, clock, dataDir: '/data', log: quiet, write: async (...args) => written.push(args) });
  assert.equal(result.ok, false);
  assert.equal(written.length, 0);
});
