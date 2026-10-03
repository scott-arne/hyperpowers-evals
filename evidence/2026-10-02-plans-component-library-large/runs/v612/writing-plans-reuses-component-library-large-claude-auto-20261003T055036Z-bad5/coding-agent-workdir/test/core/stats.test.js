import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mean, median, percentile } from '../../src/core/math/stats.js';

test('computes nearest-rank percentiles', () => {
  const values = [15, 20, 35, 40, 50];
  assert.equal(percentile(values, 30), 20);
  assert.equal(percentile(values, 100), 50);
  assert.equal(median(values), 35);
  assert.equal(mean(values), 32);
});
