import assert from 'node:assert/strict';
import { test } from 'node:test';
import { prometheusSource } from './prometheus.js';

test('prometheus: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = prometheusSource({ baseUrl: 'https://prometheus.test', http });
  await source.endpoints();
  await source.slos();
  assert.deepEqual(seen, [
    'https://prometheus.test/api/v1/harbor/endpoints',
    'https://prometheus.test/api/v1/harbor/slos',
  ]);
});
