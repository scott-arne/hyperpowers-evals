import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../../src/server.js';

test('each page title matches its nav label', async () => {
  const links = [...(await handle('/')).body.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
  for (const [, href, label] of links) {
    assert.match((await handle(href)).body, new RegExp(`<title>${label} · Harbor</title>`), href);
  }
});
