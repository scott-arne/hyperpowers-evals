import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMaintenance } from '../../src/pages/maintenance.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  windows: [
    { id: 'mw-200', title: 'Upgrade ledger', service: 'reports', startsAt: '2026-10-04T01:00:00Z', endsAt: '2026-10-06T09:41:00Z', state: 'upcoming' },
    { id: 'mw-201', title: 'Patch auth', service: 'scheduler', startsAt: '2026-09-20T01:00:00Z', endsAt: '2026-09-22T00:01:00Z', state: 'done' },
    { id: 'mw-202', title: 'Resize catalog', service: 'media', startsAt: '2026-10-02T01:00:00Z', endsAt: '2026-10-04T06:16:00Z', state: 'upcoming' },
  ],
};

test('shows upcoming by default', () => {
  const html = renderMaintenance(snapshot, {});
  assert.ok(html.includes('<strong>Upgrade ledger</strong>'));
  assert.ok(!html.includes('<strong>Patch auth</strong>'));
  assert.ok(html.includes('<strong>Resize catalog</strong>'));
  assert.ok(html.includes('<a href="/maintenance?when=upcoming" aria-current="page">'));
});

test('shows done on request', () => {
  const html = renderMaintenance(snapshot, { when: 'done' });
  assert.ok(!html.includes('<strong>Upgrade ledger</strong>'));
  assert.ok(html.includes('<strong>Patch auth</strong>'));
  assert.ok(!html.includes('<strong>Resize catalog</strong>'));
});

test('colors state', () => {
  assert.ok(renderMaintenance(snapshot, {}).includes('<span class="pill pill-amber">upcoming</span>'));
});

test('says when there are none', () => {
  assert.ok(renderMaintenance({ ...snapshot, windows: [] }, {}).includes('<p class="muted">No maintenance windows to show.</p>'));
});
