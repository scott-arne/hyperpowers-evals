import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isDue, parseInterval } from './schedule.js';

test('parses intervals', () => {
  assert.equal(parseInterval('30s'), 30_000);
  assert.equal(parseInterval('6h'), 21_600_000);
  assert.throws(() => parseInterval('1d'), /bad interval/);
});

test('a job is due once its interval has passed', () => {
  assert.equal(isDue({}, undefined, 0), true);
  assert.equal(isDue({}, 0, 59_999), false);
  assert.equal(isDue({ every: '6h' }, 0, 21_600_000), true);
});
