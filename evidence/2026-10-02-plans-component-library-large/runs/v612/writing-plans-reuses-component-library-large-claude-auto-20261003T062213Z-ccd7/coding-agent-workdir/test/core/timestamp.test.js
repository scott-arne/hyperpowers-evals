import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatTimestamp } from '../../src/core/format/timestamp.js';

test('formats in UTC to the minute', () => {
  assert.equal(formatTimestamp('2026-10-01T09:30:42Z'), '2026-10-01 09:30 UTC');
});

test('returns an empty string for junk', () => {
  assert.equal(formatTimestamp('yesterday'), '');
});
