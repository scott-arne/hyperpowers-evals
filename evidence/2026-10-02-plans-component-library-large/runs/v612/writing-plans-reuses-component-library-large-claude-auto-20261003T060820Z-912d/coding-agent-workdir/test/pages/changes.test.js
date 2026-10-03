import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderChanges } from '../../src/pages/changes.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  changes: [
    { id: 'cr-880', title: 'Rotate TLS ciphers for auth', author: 'tomas', risk: 'high', state: 'pending', openedAt: '2026-09-28T05:59:00Z' },
    { id: 'cr-881', title: 'Raise cache TTLs for search', author: 'sam', risk: 'low', state: 'approved', openedAt: '2026-09-26T20:00:00Z' },
    { id: 'cr-882', title: 'Move logs for billing', author: 'ivan', risk: 'medium', state: 'pending', openedAt: '2026-09-25T06:20:00Z' },
  ],
};

test('shows pending by default', () => {
  const html = renderChanges(snapshot, {});
  assert.ok(html.includes('<strong>Rotate TLS ciphers for auth</strong>'));
  assert.ok(!html.includes('<strong>Raise cache TTLs for search</strong>'));
  assert.ok(html.includes('<strong>Move logs for billing</strong>'));
  assert.ok(html.includes('<a href="/changes?view=pending" aria-current="page">'));
});

test('shows decided on request', () => {
  const html = renderChanges(snapshot, { view: 'decided' });
  assert.ok(!html.includes('<strong>Rotate TLS ciphers for auth</strong>'));
  assert.ok(html.includes('<strong>Raise cache TTLs for search</strong>'));
  assert.ok(!html.includes('<strong>Move logs for billing</strong>'));
});

test('colors risk', () => {
  assert.ok(renderChanges(snapshot, {}).includes('<span class="pill pill-red">high</span>'));
});

test('says when there are none', () => {
  assert.ok(renderChanges({ ...snapshot, changes: [] }, {}).includes('<p class="muted">No change requests to show.</p>'));
});
