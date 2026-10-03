import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inventorySource } from './inventory.js';

test('inventory: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = inventorySource({ baseUrl: 'https://inventory.test', http });
  await source.hosts();
  await source.regions();
  await source.webhooks();
  assert.deepEqual(seen, [
    'https://inventory.test/api/hosts',
    'https://inventory.test/api/regions',
    'https://inventory.test/api/webhooks',
  ]);
});
