import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatBytes } from '../../src/core/format/bytes.js';

test('formats binary multiples', () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(5 * 1024 ** 3), '5.0 GB');
});
