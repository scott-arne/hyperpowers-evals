import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/webhooks.js';
import { collect } from './webhooks.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { inventory: { webhooks: async () => fixture('webhooks.json') } };
const invalid = { inventory: { webhooks: async () => fixture('webhooks.invalid.json') } };

test('webhooks: maps host inventory records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('webhooks.expected.json'));
});

test('webhooks: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('webhooks: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
