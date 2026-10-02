import assert from 'node:assert/strict';
import { test } from 'node:test';
import { emptyState, statusChip } from '../../src/ui/index.js';

test('statusChip uses the tone class', () => {
  assert.equal(statusChip('ok', 'ok'), '<span class="ui-chip ui-chip--ok">ok</span>');
});

test('statusChip falls back to muted for an unknown tone', () => {
  assert.match(statusChip('x', 'purple'), /ui-chip--muted/);
});

test('emptyState escapes its title', () => {
  assert.match(emptyState({ title: 'a < b' }), /a &lt; b/);
});
