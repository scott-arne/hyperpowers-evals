import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/capacity.js';
import { collect } from './capacity.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { aws: { quotas: async () => fixture('capacity.json') } };
const invalid = { aws: { quotas: async () => fixture('capacity.invalid.json') } };

test('capacity: maps AWS service quotas API records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('capacity.expected.json'));
});

test('capacity: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('capacity: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
