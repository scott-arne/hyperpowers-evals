import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../../src/server.js';

const dataDir = fileURLToPath(new URL('./fixtures/empty/', import.meta.url));

// Every snapshot can legitimately be empty: a quiet night has no alerts.
test('every page renders an empty snapshot', async () => {
  const links = [...(await handle('/')).body.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of links) {
    const res = await handle(href, { dataDir });
    assert.equal(res.status, 200, href);
    assert.doesNotMatch(res.body, /undefined|NaN/, href);
  }
});
