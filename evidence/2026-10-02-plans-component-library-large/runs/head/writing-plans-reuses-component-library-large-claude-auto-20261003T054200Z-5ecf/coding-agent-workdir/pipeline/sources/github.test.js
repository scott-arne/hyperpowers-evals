import assert from 'node:assert/strict';
import { test } from 'node:test';
import { githubSource } from './github.js';

test('github: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = githubSource({ baseUrl: 'https://github.test', http });
  await source.changeRequests();
  await source.teams();
  assert.deepEqual(seen, [
    'https://github.test/api/v3/orgs/harbor/change-requests',
    'https://github.test/api/v3/orgs/harbor/teams',
  ]);
});
