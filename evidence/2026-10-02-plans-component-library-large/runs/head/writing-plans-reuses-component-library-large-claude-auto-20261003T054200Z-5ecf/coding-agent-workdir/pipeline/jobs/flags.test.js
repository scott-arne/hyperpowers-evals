import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/flags.js';
import { collect } from './flags.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { launchdarkly: { flags: async () => fixture('flags.json') } };
const invalid = { launchdarkly: { flags: async () => fixture('flags.invalid.json') } };

test('flags: maps LaunchDarkly records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources), fixture('flags.expected.json'));
});

test('flags: every row matches the schema', async () => {
  for (const row of await collect(sources)) assert.deepEqual(checkShape(row, fields), []);
});

test('flags: leaves a missing name for validation to catch', async () => {
  const [row] = await collect(invalid);
  assert.deepEqual(checkShape(row, fields), ['missing name']);
});
