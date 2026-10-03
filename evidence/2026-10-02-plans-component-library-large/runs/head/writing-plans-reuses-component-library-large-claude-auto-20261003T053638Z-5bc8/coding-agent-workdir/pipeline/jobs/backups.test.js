import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/backups.js';
import { collect } from './backups.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { postgres: { backups: async () => fixture('backups.json') } };
const invalid = { postgres: { backups: async () => fixture('backups.invalid.json') } };

test('backups: maps database fleet API records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('backups.expected.json'));
});

test('backups: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('backups: leaves a missing database for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing database']);
});
