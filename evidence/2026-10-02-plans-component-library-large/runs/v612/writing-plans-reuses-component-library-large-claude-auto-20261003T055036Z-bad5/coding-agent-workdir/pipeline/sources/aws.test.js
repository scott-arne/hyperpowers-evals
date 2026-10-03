import assert from 'node:assert/strict';
import { test } from 'node:test';
import { awsSource } from './aws.js';

test('aws: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = awsSource({ baseUrl: 'https://aws.test', http });
  await source.quotas();
  assert.deepEqual(seen, [
    'https://aws.test/quotas/v1/quotas',
  ]);
});
