import assert from 'node:assert/strict';
import { test } from 'node:test';
import { vaultSource } from './vault.js';

test('vault: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = vaultSource({ baseUrl: 'https://vault.test', http });
  await source.secrets();
  await source.tokens();
  assert.deepEqual(seen, [
    'https://vault.test/v1/sys/harbor/secrets',
    'https://vault.test/v1/sys/harbor/tokens',
  ]);
});
