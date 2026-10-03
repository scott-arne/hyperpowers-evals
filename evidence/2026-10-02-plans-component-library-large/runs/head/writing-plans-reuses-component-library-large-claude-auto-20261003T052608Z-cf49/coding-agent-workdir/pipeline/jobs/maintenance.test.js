import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/maintenance.js';
import { collect } from './maintenance.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { statuspage: { maintenances: async () => fixture('maintenance.json') } };
const invalid = { statuspage: { maintenances: async () => fixture('maintenance.invalid.json') } };

test('maintenance: maps Statuspage records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('maintenance.expected.json'));
});

test('maintenance: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('maintenance: leaves a missing id for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing id']);
});
