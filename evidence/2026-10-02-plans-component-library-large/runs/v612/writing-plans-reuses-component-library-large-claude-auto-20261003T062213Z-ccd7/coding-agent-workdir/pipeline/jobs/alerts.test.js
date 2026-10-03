import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/alerts.js';
import { collect } from './alerts.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { alertmanager: { alerts: async () => fixture('alerts.json') } };
const invalid = { alertmanager: { alerts: async () => fixture('alerts.invalid.json') } };

test('alerts: maps Alertmanager records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('alerts.expected.json'));
});

test('alerts: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('alerts: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
