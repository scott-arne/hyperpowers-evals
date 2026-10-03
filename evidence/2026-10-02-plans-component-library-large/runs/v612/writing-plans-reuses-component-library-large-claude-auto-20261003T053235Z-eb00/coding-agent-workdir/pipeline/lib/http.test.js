import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHttpClient } from './http.js';

const response = (status, body) => ({ ok: status < 400, status, json: async () => body });

test('retries a failed request, then returns the body', async () => {
  const replies = [response(503), response(200, [{ name: 'billing' }])];
  const http = createHttpClient({ fetch: async () => replies.shift(), wait: async () => {} });
  assert.deepEqual(await http.getJson('https://upstream.test/x'), [{ name: 'billing' }]);
});

test('gives up after the last attempt with the status', async () => {
  const http = createHttpClient({ fetch: async () => response(500), attempts: 2, wait: async () => {} });
  await assert.rejects(http.getJson('https://upstream.test/x'), { name: 'HttpError', status: 500 });
});
