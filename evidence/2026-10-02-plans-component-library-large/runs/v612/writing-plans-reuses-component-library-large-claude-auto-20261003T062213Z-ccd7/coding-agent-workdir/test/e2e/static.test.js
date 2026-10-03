import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { test } from 'node:test';
import { handle } from '../../src/server.js';

const PUBLIC = new URL('../../public/', import.meta.url);
const TYPES = { css: 'text/css', js: 'text/javascript', svg: 'image/svg+xml' };

test('serves every public file with its content type', async () => {
  const files = readdirSync(PUBLIC, { recursive: true }).filter((f) => /\.(css|js|svg)$/.test(f));
  assert.ok(files.length > 10);
  for (const file of files) {
    const res = await handle(`/public/${file}`);
    assert.equal(res.status, 200, file);
    assert.equal(res.type, TYPES[file.split('.').pop()], file);
  }
});

test('refuses paths outside public/', async () => {
  assert.equal((await handle('/public/../package.json')).status, 404);
});
