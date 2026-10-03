import assert from 'node:assert/strict';
import { test } from 'node:test';
import { groupBy } from '../../src/core/collections/group-by.js';

test('groups in first-seen key order', () => {
  const groups = groupBy(['b1', 'a1', 'b2'], (s) => s[0]);
  assert.deepEqual([...groups.keys()], ['b', 'a']);
  assert.deepEqual(groups.get('b'), ['b1', 'b2']);
});
