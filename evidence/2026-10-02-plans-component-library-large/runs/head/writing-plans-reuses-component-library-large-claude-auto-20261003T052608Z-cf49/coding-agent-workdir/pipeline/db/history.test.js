import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SCHEMAS } from '../../src/shared/schemas/index.js';
import { openDatabase } from './client.js';
import { appendHistory, finishRun, startRun } from './history.js';
import { migrate } from './migrate.js';

test('stores one run of every checked-in snapshot', async () => {
  const db = await openDatabase(':memory:');
  await migrate(db);
  const runId = startRun(db, '2026-10-01T09:30:00Z');
  for (const [name, { key, fields }] of Object.entries(SCHEMAS)) {
    const rows = JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), 'utf8'))[key];
    appendHistory(db, name, runId, rows, fields);
    assert.equal(db.prepare(`SELECT count(*) AS n FROM ${name}_history WHERE run_id = ?`).get(runId).n, rows.length, name);
  }
  finishRun(db, runId, { finishedAt: '2026-10-01T09:30:04Z', jobs: Object.keys(SCHEMAS).length, failed: 0 });
  assert.equal(db.prepare('SELECT jobs FROM runs WHERE id = ?').get(runId).jobs, Object.keys(SCHEMAS).length);
});
