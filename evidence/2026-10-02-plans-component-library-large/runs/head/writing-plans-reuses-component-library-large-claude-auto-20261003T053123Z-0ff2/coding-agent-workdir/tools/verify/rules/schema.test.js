import assert from 'node:assert/strict';
import { test } from 'node:test';
import { schema } from './schema.js';

test('reports rows that do not match the schema', () => {
  const snapshot = { runbooks: [{ id: 'reindex', title: 'Search reindex', summary: 's', url: 7 }] };
  assert.deepEqual(schema(snapshot, { name: 'runbooks' }), ['row 0: url is not a string']);
});

test('reports a snapshot nobody declared', () => {
  assert.deepEqual(schema({}, { name: 'mystery' }), ['no schema for mystery']);
});
