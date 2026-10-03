import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pagerdutySource } from './pagerduty.js';

test('pagerduty: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = pagerdutySource({ baseUrl: 'https://pagerduty.test', http });
  await source.escalationSteps();
  await source.incidents();
  await source.rotations();
  assert.deepEqual(seen, [
    'https://pagerduty.test/escalation-steps',
    'https://pagerduty.test/incidents',
    'https://pagerduty.test/rotations',
  ]);
});
