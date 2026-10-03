import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/oncall.js';
import { collect } from './oncall.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { pagerduty: { rotations: async () => fixture('oncall.json') } };
const invalid = { pagerduty: { rotations: async () => fixture('oncall.invalid.json') } };

test('oncall: maps PagerDuty records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('oncall.expected.json'));
});

test('oncall: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('oncall: leaves a missing team for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing team']);
});
