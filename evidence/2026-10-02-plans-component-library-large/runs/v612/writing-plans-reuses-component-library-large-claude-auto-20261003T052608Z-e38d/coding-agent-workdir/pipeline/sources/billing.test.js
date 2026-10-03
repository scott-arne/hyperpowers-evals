import assert from 'node:assert/strict';
import { test } from 'node:test';
import { billingSource } from './billing.js';

test('billing: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = billingSource({ baseUrl: 'https://billing.test', http });
  await source.budgets();
  assert.deepEqual(seen, [
    'https://billing.test/v1/budgets',
  ]);
});
