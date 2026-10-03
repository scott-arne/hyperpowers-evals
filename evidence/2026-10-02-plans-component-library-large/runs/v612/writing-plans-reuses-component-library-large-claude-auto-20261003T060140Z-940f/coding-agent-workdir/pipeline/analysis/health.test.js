import assert from 'node:assert/strict';
import { test } from 'node:test';
import { healthFromChecks } from './health.js';

test('passing, degraded, failing', () => {
  assert.equal(healthFromChecks(3, 3), 'passing');
  assert.equal(healthFromChecks(1, 3), 'degraded');
  assert.equal(healthFromChecks(0, 3), 'failing');
});
