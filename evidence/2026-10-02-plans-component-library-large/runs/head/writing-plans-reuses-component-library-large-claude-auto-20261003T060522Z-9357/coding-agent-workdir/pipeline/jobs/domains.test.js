import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/domains.js';
import { collect } from './domains.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { dns: { domains: async () => fixture('domains.json') } };
const invalid = { dns: { domains: async () => fixture('domains.invalid.json') } };

test('domains: maps DNS provider records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('domains.expected.json'));
});

test('domains: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('domains: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
