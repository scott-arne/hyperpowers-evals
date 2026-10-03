import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isStale } from '../../src/shared/freshness.js';

const now = Date.parse('2026-10-01T09:30:00Z');

test('stale after five minutes, or when the time is unreadable', () => {
  assert.equal(isStale('2026-10-01T09:25:00Z', now), false);
  assert.equal(isStale('2026-10-01T09:24:59Z', now), true);
  assert.equal(isStale('yesterday', now), true);
});
