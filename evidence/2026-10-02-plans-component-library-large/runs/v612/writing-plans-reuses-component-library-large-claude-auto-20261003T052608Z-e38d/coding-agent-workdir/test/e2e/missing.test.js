import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../../src/server.js';

const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));

test('every page answers 503 without its snapshot', async () => {
  const links = [...(await handle('/')).body.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
  for (const href of links) {
    const res = await handle(href, { dataDir });
    assert.equal(res.status, 503, href);
    assert.match(res.body, /Snapshot unavailable/, href);
  }
});
