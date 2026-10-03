import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ttlCache } from '../../src/core/cache/ttl.js';
import { fixedClock } from '../../src/core/time/clock.js';

test('expires entries after the ttl', () => {
  const clock = fixedClock(0);
  const cache = ttlCache(1000, clock);
  cache.set('k', 'v');
  clock.advance(999);
  assert.equal(cache.get('k'), 'v');
  clock.advance(1);
  assert.equal(cache.get('k'), undefined);
});
