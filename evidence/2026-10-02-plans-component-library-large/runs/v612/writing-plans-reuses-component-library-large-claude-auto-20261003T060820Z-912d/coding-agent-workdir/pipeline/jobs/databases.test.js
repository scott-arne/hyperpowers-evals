import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/databases.js';
import { collect } from './databases.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { postgres: { instances: async () => fixture('databases.json') } };
const invalid = { postgres: { instances: async () => fixture('databases.invalid.json') } };

test('databases: maps database fleet API records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('databases.expected.json'));
});

test('databases: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('databases: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
