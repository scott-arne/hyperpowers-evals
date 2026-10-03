import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hostStatus } from './host-status.js';

test('maps instance states', () => {
  assert.equal(hostStatus('running'), 'up');
  assert.equal(hostStatus('stopping'), 'draining');
  assert.equal(hostStatus('pending'), 'down');
});
