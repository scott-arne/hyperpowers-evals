import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sloStatus } from './budget.js';

test('breached below zero, at risk below a quarter', () => {
  assert.equal(sloStatus(-1), 'breached');
  assert.equal(sloStatus(0), 'at-risk');
  assert.equal(sloStatus(24), 'at-risk');
  assert.equal(sloStatus(25), 'met');
});
