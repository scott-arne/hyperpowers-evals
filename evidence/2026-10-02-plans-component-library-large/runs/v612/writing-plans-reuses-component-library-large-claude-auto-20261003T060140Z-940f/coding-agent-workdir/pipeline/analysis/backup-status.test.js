import assert from 'node:assert/strict';
import { test } from 'node:test';
import { backupStatus } from './backup-status.js';

test('maps fleet states, unknown ones to failed', () => {
  assert.equal(backupStatus('COMPLETED'), 'ok');
  assert.equal(backupStatus('PENDING'), 'running');
  assert.equal(backupStatus('EXPIRED'), 'failed');
});
