import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/teams.js';
import { collect } from './teams.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { github: { teams: async () => fixture('teams.json') } };
const invalid = { github: { teams: async () => fixture('teams.invalid.json') } };

test('teams: maps GitHub records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('teams.expected.json'));
});

test('teams: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('teams: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
