import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/runbooks.js';
import { collect } from './runbooks.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { wiki: { runbooks: async () => fixture('runbooks.json') } };
const invalid = { wiki: { runbooks: async () => fixture('runbooks.invalid.json') } };

test('runbooks: maps wiki records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('runbooks.expected.json'));
});

test('runbooks: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('runbooks: leaves a missing id for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing id']);
});
