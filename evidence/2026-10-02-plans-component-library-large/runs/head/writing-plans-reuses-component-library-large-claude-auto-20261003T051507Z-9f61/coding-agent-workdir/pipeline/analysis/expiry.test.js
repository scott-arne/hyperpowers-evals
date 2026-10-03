import assert from 'node:assert/strict';
import { test } from 'node:test';
import { certStatus } from './expiry.js';

const now = Date.parse('2026-10-01T00:00:00Z');

test('expired, expiring within 30 days, then valid', () => {
  assert.equal(certStatus('2026-09-30T23:59:00Z', now), 'expired');
  assert.equal(certStatus('2026-10-30T23:59:00Z', now), 'expiring');
  assert.equal(certStatus('2026-10-31T00:00:00Z', now), 'valid');
});
