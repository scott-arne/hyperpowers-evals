import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/status.js';
import { collect } from './status.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { statuspage: { components: async () => fixture('status.json') } };
const invalid = { statuspage: { components: async () => fixture('status.invalid.json') } };

test('status: maps Statuspage records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('status.expected.json'));
});

test('status: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('status: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
