import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/changes.js';
import { collect } from './changes.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { github: { changeRequests: async () => fixture('changes.json') } };
const invalid = { github: { changeRequests: async () => fixture('changes.invalid.json') } };

test('changes: maps GitHub records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('changes.expected.json'));
});

test('changes: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('changes: leaves a missing id for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing id']);
});
