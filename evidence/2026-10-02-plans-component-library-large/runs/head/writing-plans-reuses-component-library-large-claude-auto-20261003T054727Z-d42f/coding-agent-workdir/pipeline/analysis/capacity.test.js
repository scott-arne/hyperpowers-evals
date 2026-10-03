import assert from 'node:assert/strict';
import { test } from 'node:test';
import { capacityStatus } from './capacity.js';

test('ok up to 80%, tight up to 95%, then full', () => {
  assert.equal(capacityStatus(80, 100), 'ok');
  assert.equal(capacityStatus(81, 100), 'tight');
  assert.equal(capacityStatus(95, 100), 'tight');
  assert.equal(capacityStatus(96, 100), 'full');
});
