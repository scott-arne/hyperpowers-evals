import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retry } from '../../src/core/retry/retry.js';

test('retries until the function succeeds', async () => {
  let calls = 0;
  const result = await retry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error('flaky');
      return 'ok';
    },
    { wait: async () => {} },
  );
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('rethrows the last error', async () => {
  await assert.rejects(retry(async (n) => Promise.reject(new Error(`try ${n}`)), { attempts: 2, wait: async () => {} }), /try 1/);
});
