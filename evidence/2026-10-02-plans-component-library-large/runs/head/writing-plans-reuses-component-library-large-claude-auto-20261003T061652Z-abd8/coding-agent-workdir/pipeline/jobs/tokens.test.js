import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/tokens.js';
import { collect } from './tokens.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { vault: { tokens: async () => fixture('tokens.json') } };
const invalid = { vault: { tokens: async () => fixture('tokens.invalid.json') } };

test('tokens: maps Vault records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('tokens.expected.json'));
});

test('tokens: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('tokens: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
