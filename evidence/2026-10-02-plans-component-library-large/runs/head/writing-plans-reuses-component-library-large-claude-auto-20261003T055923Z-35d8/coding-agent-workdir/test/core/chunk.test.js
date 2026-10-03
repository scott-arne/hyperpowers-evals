import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunk } from '../../src/core/collections/chunk.js';

test('splits into fixed-size chunks with a short tail', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('rejects a zero size', () => {
  assert.throws(() => chunk([1], 0), RangeError);
});
