import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkShape } from '../../src/core/validate/shape.js';

const SPEC = { id: 'string', count: 'number', finishedAt: 'timestamp?' };

test('accepts a valid record, with null for an optional field', () => {
  assert.deepEqual(checkShape({ id: 'a', count: 2, finishedAt: null }, SPEC), []);
});

test('lists every problem', () => {
  assert.deepEqual(checkShape({ id: 3, finishedAt: 'soon' }, SPEC), ['id is not a string', 'missing count', 'finishedAt is not a timestamp']);
});
