import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/incidents.js';
import { collect } from './incidents.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { pagerduty: { incidents: async () => fixture('incidents.json') } };
const invalid = { pagerduty: { incidents: async () => fixture('incidents.invalid.json') } };

test('incidents: maps PagerDuty records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('incidents.expected.json'));
});

test('incidents: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('incidents: leaves a missing id for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing id']);
});
