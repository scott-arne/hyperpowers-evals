import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/endpoints.js';
import { collect } from './endpoints.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { prometheus: { endpoints: async () => fixture('endpoints.json') } };
const invalid = { prometheus: { endpoints: async () => fixture('endpoints.invalid.json') } };

test('endpoints: maps Prometheus records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('endpoints.expected.json'));
});

test('endpoints: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('endpoints: leaves a missing path for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing path']);
});
