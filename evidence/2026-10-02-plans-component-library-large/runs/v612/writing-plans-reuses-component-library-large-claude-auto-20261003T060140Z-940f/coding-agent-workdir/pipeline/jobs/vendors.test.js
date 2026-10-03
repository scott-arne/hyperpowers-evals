import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/vendors.js';
import { collect } from './vendors.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { statuspage: { vendors: async () => fixture('vendors.json') } };
const invalid = { statuspage: { vendors: async () => fixture('vendors.invalid.json') } };

test('vendors: maps Statuspage records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('vendors.expected.json'));
});

test('vendors: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('vendors: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
