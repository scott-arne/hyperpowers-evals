import assert from 'node:assert/strict';
import { test } from 'node:test';
import { stableStringify } from '../../src/core/json/stable-stringify.js';

test('ignores key order', () => {
  assert.equal(stableStringify({ b: 1, a: [{ d: 2, c: 3 }] }), stableStringify({ a: [{ c: 3, d: 2 }], b: 1 }));
});
