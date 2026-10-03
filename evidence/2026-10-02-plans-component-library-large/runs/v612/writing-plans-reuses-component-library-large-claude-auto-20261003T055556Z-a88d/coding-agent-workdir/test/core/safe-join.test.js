import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeJoin } from '../../src/core/paths/safe-join.js';

test('keeps paths under the root', () => {
  assert.ok(safeJoin('/srv/public', 'img/logo.svg').endsWith('/srv/public/img/logo.svg'));
});

test('refuses to climb out of the root', () => {
  assert.equal(safeJoin('/srv/public', '../../etc/passwd'), null);
});
