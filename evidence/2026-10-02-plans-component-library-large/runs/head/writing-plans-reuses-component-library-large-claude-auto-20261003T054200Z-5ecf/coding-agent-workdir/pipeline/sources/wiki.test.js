import assert from 'node:assert/strict';
import { test } from 'node:test';
import { wikiSource } from './wiki.js';

test('wiki: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = wikiSource({ baseUrl: 'https://wiki.test', http });
  await source.reports();
  await source.runbooks();
  assert.deepEqual(seen, [
    'https://wiki.test/rest/api/space/OPS/reports',
    'https://wiki.test/rest/api/space/OPS/runbooks',
  ]);
});
