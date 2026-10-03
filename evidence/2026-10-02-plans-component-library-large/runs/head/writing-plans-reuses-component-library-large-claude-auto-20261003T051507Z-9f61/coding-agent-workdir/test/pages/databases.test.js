import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDatabases } from '../../src/pages/databases.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  databases: [
    { name: 'billing-main', engine: 'postgres', version: '17.2', size: '562 GB', replicas: 0, status: 'maintenance' },
    { name: 'ledger', engine: 'redis', version: '7.4.1', size: '109 GB', replicas: 1, status: 'online' },
    { name: 'search-meta', engine: 'postgres', version: '16.4', size: '704 GB', replicas: 2, status: 'offline' },
  ],
};

test('renders a row per database', () => {
  const html = renderDatabases(snapshot);
  for (const d of snapshot.databases) assert.ok(html.includes(`<td>${d.name}</td>`), d.name);
});

test('colors status', () => {
  assert.ok(renderDatabases(snapshot).includes('<span class="pill pill-amber">maintenance</span>'));
});

test('says when there are none', () => {
  assert.ok(renderDatabases({ ...snapshot, databases: [] }).includes('<p class="muted">No databases.</p>'));
});
