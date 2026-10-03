import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dnsSource } from './dns.js';

test('dns: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = dnsSource({ baseUrl: 'https://dns.test', http });
  await source.domains();
  assert.deepEqual(seen, [
    'https://dns.test/v2/domains',
  ]);
});
