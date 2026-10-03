import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateRows } from './validate.js';

const fields = { name: 'string', count: 'number', seenAt: 'timestamp?' };

test('accepts rows that match the fields', () => {
  validateRows('queues', [{ name: 'mail', count: 3, seenAt: null }], fields);
});

test('reports every problem with its row', () => {
  assert.throws(() => validateRows('queues', [{ name: 'mail', count: 3, seenAt: null }, { name: 7 }], fields), {
    name: 'SnapshotError',
    problems: ['row 1: name is not a string', 'row 1: missing count', 'row 1: missing seenAt'],
  });
});
