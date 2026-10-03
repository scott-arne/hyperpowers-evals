import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ownerOf } from '../../src/shared/catalog.js';
import { runbookUrl } from '../../src/shared/links.js';

test('runbook links are wiki slugs', () => {
  assert.equal(runbookUrl('queue-backlog'), 'https://wiki.example.com/runbooks/queue-backlog');
});

test('unknown services fall back to platform', () => {
  assert.equal(ownerOf('billing'), 'payments');
  assert.equal(ownerOf('new-thing'), 'platform');
});
