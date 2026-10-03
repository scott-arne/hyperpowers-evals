import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/services.js';
import { collect } from './services.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { kubernetes: { deployments: async () => fixture('services.json') } };
const invalid = { kubernetes: { deployments: async () => fixture('services.invalid.json') } };

test('services: maps Kubernetes API records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('services.expected.json'));
});

test('services: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('services: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
