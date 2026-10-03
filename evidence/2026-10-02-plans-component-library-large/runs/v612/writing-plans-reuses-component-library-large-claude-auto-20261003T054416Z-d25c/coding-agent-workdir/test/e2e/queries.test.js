import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../../src/server.js';

// Links get pasted into chat and edited by hand; a bad parameter falls back
// to the default instead of failing the page.
test('unknown query values fall back to the defaults', async () => {
  const links = [...(await handle('/')).body.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of links) {
    const res = await handle(`${href}?sort=bogus&dir=sideways&env=mars&region=moon&tab=nope`);
    assert.equal(res.status, 200, href);
  }
});
