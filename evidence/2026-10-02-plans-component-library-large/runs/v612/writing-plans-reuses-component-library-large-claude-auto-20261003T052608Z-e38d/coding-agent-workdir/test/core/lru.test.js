import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LruCache } from '../../src/core/cache/lru.js';

test('evicts the least recently used entry', () => {
  const cache = new LruCache(2);
  cache.set('a', 1).set('b', 2);
  cache.get('a');
  cache.set('c', 3);
  assert.equal(cache.has('b'), false);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.size, 2);
});
