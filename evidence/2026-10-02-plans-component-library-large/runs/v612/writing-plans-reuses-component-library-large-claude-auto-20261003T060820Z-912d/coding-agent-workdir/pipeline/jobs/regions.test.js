import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/regions.js';
import { collect } from './regions.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { inventory: { regions: async () => fixture('regions.json') } };
const invalid = { inventory: { regions: async () => fixture('regions.invalid.json') } };

test('regions: maps host inventory records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('regions.expected.json'));
});

test('regions: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('regions: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
