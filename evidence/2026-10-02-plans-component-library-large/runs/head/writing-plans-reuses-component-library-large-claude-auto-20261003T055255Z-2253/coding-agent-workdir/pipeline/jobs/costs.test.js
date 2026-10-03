import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/costs.js';
import { collect } from './costs.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { billing: { budgets: async () => fixture('costs.json') } };
const invalid = { billing: { budgets: async () => fixture('costs.invalid.json') } };

test('costs: maps billing export records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('costs.expected.json'));
});

test('costs: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('costs: leaves a missing service for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing service']);
});
