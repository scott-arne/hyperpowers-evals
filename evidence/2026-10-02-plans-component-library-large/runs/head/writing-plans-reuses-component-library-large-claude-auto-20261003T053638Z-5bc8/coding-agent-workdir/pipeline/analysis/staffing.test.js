import assert from 'node:assert/strict';
import { test } from 'node:test';
import { staffingFor } from './staffing.js';

test('four people staff a rotation', () => {
  assert.equal(staffingFor(3), 'short');
  assert.equal(staffingFor(4), 'staffed');
});
