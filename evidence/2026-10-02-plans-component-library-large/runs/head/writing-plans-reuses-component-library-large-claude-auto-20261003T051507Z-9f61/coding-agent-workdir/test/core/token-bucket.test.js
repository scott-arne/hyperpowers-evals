import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tokenBucket } from '../../src/core/rate/token-bucket.js';
import { fixedClock } from '../../src/core/time/clock.js';

test('allows a burst, then refills over time', () => {
  const clock = fixedClock(0);
  const bucket = tokenBucket({ capacity: 2, perSecond: 1, clock });
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), true);
  assert.equal(bucket.take(), false);
  clock.advance(1000);
  assert.equal(bucket.take(), true);
});
