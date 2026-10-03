import assert from 'node:assert/strict';
import { test } from 'node:test';
import { certScannerSource } from './cert-scanner.js';

test('cert-scanner: requests each collection under the base URL', async () => {
  const seen = [];
  const http = { getJson: async (url) => (seen.push(url), []) };
  const source = certScannerSource({ baseUrl: 'https://cert-scanner.test', http });
  await source.certificates();
  assert.deepEqual(seen, [
    'https://cert-scanner.test/api/certificates',
  ]);
});
