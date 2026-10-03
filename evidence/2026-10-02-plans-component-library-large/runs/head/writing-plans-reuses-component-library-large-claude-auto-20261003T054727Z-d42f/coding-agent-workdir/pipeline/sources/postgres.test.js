import assert from 'node:assert/strict';
import { test } from 'node:test';
import { postgresSource } from './postgres.js';

test('postgres: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = postgresSource({ baseUrl: 'https://postgres.test', http });
  await source.backups();
  await source.instances();
  assert.deepEqual(seen, [
    'https://postgres.test/fleet/v1/backups',
    'https://postgres.test/fleet/v1/instances',
  ]);
});
