import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ciSource } from './ci.js';

test('ci: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = ciSource({ baseUrl: 'https://ci.test', http });
  await source.auditLog();
  await source.deploys();
  assert.deepEqual(seen, [
    'https://ci.test/api/v4/audit-log',
    'https://ci.test/api/v4/deploys',
  ]);
});
