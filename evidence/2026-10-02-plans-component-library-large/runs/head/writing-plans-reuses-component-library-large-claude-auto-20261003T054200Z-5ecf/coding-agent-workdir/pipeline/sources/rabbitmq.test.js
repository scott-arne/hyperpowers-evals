import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rabbitmqSource } from './rabbitmq.js';

test('rabbitmq: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = rabbitmqSource({ baseUrl: 'https://rabbitmq.test', http });
  await source.queues();
  assert.deepEqual(seen, [
    'https://rabbitmq.test/api/queues',
  ]);
});
