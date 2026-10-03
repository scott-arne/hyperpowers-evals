import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/secrets.js';
import { collect } from './secrets.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { vault: { secrets: async () => fixture('secrets.json') } };
const invalid = { vault: { secrets: async () => fixture('secrets.invalid.json') } };

test('secrets: maps Vault records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('secrets.expected.json'));
});

test('secrets: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('secrets: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
