import assert from 'node:assert/strict';
import { test } from 'node:test';
import { alertmanagerSource } from './alertmanager.js';

test('alertmanager: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = alertmanagerSource({ baseUrl: 'https://alertmanager.test', http });
  await source.alerts();
  assert.deepEqual(seen, [
    'https://alertmanager.test/api/v2/alerts',
  ]);
});
