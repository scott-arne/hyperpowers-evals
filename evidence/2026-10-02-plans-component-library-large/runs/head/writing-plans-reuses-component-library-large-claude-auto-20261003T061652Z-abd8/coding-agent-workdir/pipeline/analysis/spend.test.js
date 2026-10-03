import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dollars, spendStatus } from './spend.js';

test('rounds cents to whole dollars', () => {
  assert.equal(dollars(420_049), '$4200');
  assert.equal(dollars(420_050), '$4201');
});

test('near above 90% of the budget, over above it', () => {
  assert.equal(spendStatus(90_000, 100_000), 'under');
  assert.equal(spendStatus(90_001, 100_000), 'near');
  assert.equal(spendStatus(100_001, 100_000), 'over');
});
