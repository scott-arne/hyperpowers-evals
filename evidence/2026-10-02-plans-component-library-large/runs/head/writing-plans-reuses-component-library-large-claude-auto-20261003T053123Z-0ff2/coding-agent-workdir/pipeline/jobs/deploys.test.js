import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/deploys.js';
import { collect } from './deploys.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { ci: { deploys: async () => fixture('deploys.json') } };
const invalid = { ci: { deploys: async () => fixture('deploys.invalid.json') } };

test('deploys: maps CI system records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('deploys.expected.json'));
});

test('deploys: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('deploys: leaves a missing id for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing id']);
});
