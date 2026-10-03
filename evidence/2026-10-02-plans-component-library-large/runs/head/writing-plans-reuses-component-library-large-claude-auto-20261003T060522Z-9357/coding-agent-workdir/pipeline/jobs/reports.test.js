import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/reports.js';
import { collect } from './reports.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { wiki: { reports: async () => fixture('reports.json') } };
const invalid = { wiki: { reports: async () => fixture('reports.invalid.json') } };

test('reports: maps wiki records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('reports.expected.json'));
});

test('reports: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('reports: leaves a missing id for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing id']);
});
