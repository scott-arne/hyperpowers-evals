import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderBackups } from '../../src/pages/backups.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  backups: [
    { database: 'billing-main', kind: 'incremental', size: '392 GB', finishedAt: '2026-10-01T02:10:00Z', status: 'failed' },
    { database: 'ledger', kind: 'incremental', size: '227 GB', finishedAt: '2026-09-30T23:40:00Z', status: 'ok' },
    { database: 'search-meta', kind: 'incremental', size: '273 GB', finishedAt: '2026-10-01T04:05:00Z', status: 'ok' },
  ],
};

test('renders a row per backup', () => {
  const html = renderBackups(snapshot, {});
  for (const b of snapshot.backups) assert.ok(html.includes(`<td>${b.database}</td>`), b.database);
});

test('colors status', () => {
  assert.ok(renderBackups(snapshot, {}).includes('<span class="pill pill-red">failed</span>'));
});

test('sorts by finishedAt both ways', () => {
  const desc = renderBackups(snapshot, { sort: 'finishedAt', dir: 'desc' });
  assert.ok(desc.indexOf('<td>search-meta</td>') < desc.indexOf('<td>ledger</td>'));
  const asc = renderBackups(snapshot, { sort: 'finishedAt' });
  assert.ok(asc.indexOf('<td>ledger</td>') < asc.indexOf('<td>search-meta</td>'));
});

test('says when there are none', () => {
  assert.ok(renderBackups({ ...snapshot, backups: [] }, {}).includes('<p class="muted">No backups.</p>'));
});
