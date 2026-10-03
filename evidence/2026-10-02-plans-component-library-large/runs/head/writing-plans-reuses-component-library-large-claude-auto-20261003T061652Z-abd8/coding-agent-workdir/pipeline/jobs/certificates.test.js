import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';
import { fields } from '../../src/shared/schemas/certificates.js';
import { collect } from './certificates.js';

const fixture = (file) => JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8'));
const sources = { certScanner: { certificates: async () => fixture('certificates.json') } };
const invalid = { certScanner: { certificates: async () => fixture('certificates.invalid.json') } };

test('certificates: maps certificate scanner records to snapshot rows', async () => {
  assert.deepEqual(await collect(sources, { now: Date.parse('2026-10-01T09:30:00Z') }), fixture('certificates.expected.json'));
});

test('certificates: every row matches the schema', async () => {
  for (const row of await collect(sources, { now: Date.parse('2026-10-01T09:30:00Z') })) assert.deepEqual(checkShape(row, fields), []);
});

test('certificates: leaves a missing domain for validation to catch', async () => {
  const [row] = await collect(invalid, { now: Date.parse('2026-10-01T09:30:00Z') });
  assert.deepEqual(checkShape(row, fields), ['missing domain']);
});
