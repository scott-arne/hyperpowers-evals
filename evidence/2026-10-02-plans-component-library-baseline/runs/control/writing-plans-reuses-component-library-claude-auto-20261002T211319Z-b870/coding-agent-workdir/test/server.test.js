import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/server.js';

test('renders the services page inside the layout', async () => {
  const res = await handle('/services?env=production');
  assert.equal(res.status, 200);
  assert.match(res.body, /<title>Services · Harbor<\/title>/);
  assert.match(res.body, /aria-current="page">Services</);
  assert.match(res.body, /<td>notifications<\/td>/);
});

test('answers 503 when the snapshot cannot be read', async () => {
  const dataDir = fileURLToPath(new URL('./no-such-dir/', import.meta.url));
  const res = await handle('/', { dataDir });
  assert.equal(res.status, 503);
  assert.match(res.body, /Snapshot unavailable/);
});

test('answers 404 for an unknown path', async () => {
  assert.equal((await handle('/nope')).status, 404);
});

test('serves the template assets', async () => {
  const res = await handle('/public/harbor.css');
  assert.equal(res.status, 200);
  assert.equal(res.type, 'text/css');
});
