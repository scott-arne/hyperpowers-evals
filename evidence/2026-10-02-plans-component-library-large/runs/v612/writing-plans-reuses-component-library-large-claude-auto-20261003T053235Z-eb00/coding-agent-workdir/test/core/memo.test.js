import assert from 'node:assert/strict';
import { test } from 'node:test';
import { memoize } from '../../src/core/cache/memo.js';

test('calls the function once per key', () => {
  let calls = 0;
  const square = memoize((n) => {
    calls += 1;
    return n * n;
  });
  assert.equal(square(4), 16);
  assert.equal(square(4), 16);
  assert.equal(calls, 1);
});
