import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/hosts.js';
import { collect } from './hosts.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { inventory: { hosts: async () => fixture('hosts.json') } };
const invalid = { inventory: { hosts: async () => fixture('hosts.invalid.json') } };

test('hosts: maps host inventory records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('hosts.expected.json'));
});

test('hosts: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('hosts: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
