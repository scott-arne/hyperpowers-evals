import assert from 'node:assert/strict';
import { test } from 'node:test';
import { launchdarklySource } from './launchdarkly.js';

test('launchdarkly: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = launchdarklySource({ baseUrl: 'https://launchdarkly.test', http });
  await source.flags();
  assert.deepEqual(seen, [
    'https://launchdarkly.test/api/v2/projects/harbor/flags',
  ]);
});
