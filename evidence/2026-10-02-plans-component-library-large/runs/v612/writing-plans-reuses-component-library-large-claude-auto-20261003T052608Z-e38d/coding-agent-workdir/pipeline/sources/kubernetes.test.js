import assert from 'node:assert/strict';
import { test } from 'node:test';
import { kubernetesSource } from './kubernetes.js';

test('kubernetes: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = kubernetesSource({ baseUrl: 'https://kubernetes.test', http });
  await source.clusters();
  await source.cronJobs();
  await source.deployments();
  assert.deepEqual(seen, [
    'https://kubernetes.test/apis/harbor/v1/clusters',
    'https://kubernetes.test/apis/harbor/v1/cron-jobs',
    'https://kubernetes.test/apis/harbor/v1/deployments',
  ]);
});
