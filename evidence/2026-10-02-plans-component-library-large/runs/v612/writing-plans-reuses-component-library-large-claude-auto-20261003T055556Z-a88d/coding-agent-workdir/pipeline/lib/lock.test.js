import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { withLock } from './lock.js';

test('a second run skips while the first holds the lock', async () => {
  const path = join(await mkdtemp(join(tmpdir(), 'harbor-lock-')), 'run.lock');
  const outer = await withLock(path, async () => withLock(path, async () => 'inner ran'));
  assert.deepEqual(outer, { skipped: false, value: { skipped: true } });
  assert.deepEqual(await withLock(path, async () => 'again'), { skipped: false, value: 'again' });
});
