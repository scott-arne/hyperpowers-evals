import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../../src/server.js';

const navLinks = (html) => [...html.matchAll(/<a href="([^"]+)"(?: aria-current="page")?>([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);

test('every nav link renders and marks itself current', async () => {
  const links = navLinks((await handle('/')).body);
  assert.ok(links.length > 20, 'the nav lists every page');
  for (const [href, label] of links) {
    const res = await handle(href);
    assert.equal(res.status, 200, href);
    assert.ok(res.body.includes(`aria-current="page">${label}<`), `${href} marks ${label} current`);
  }
});
