import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/slos.js';
import { collect } from './slos.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { prometheus: { slos: async () => fixture('slos.json') } };
const invalid = { prometheus: { slos: async () => fixture('slos.invalid.json') } };

test('slos: maps Prometheus records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('slos.expected.json'));
});

test('slos: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('slos: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
