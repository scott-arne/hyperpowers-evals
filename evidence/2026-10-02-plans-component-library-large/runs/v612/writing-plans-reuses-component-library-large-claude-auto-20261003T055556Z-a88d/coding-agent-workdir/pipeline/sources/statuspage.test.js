import assert from 'node:assert/strict';
import { test } from 'node:test';
import { statuspageSource } from './statuspage.js';

test('statuspage: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = statuspageSource({ baseUrl: 'https://statuspage.test', http });
  await source.components();
  await source.maintenances();
  await source.vendors();
  assert.deepEqual(seen, [
    'https://statuspage.test/v1/pages/harbor/components',
    'https://statuspage.test/v1/pages/harbor/maintenances',
    'https://statuspage.test/v1/pages/harbor/vendors',
  ]);
});
