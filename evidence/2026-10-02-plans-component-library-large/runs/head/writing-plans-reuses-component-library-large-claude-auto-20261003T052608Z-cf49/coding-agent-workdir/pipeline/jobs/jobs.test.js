import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/jobs.js';
import { collect } from './jobs.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { kubernetes: { cronJobs: async () => fixture('jobs.json') } };
const invalid = { kubernetes: { cronJobs: async () => fixture('jobs.invalid.json') } };

test('jobs: maps Kubernetes API records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('jobs.expected.json'));
});

test('jobs: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('jobs: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
