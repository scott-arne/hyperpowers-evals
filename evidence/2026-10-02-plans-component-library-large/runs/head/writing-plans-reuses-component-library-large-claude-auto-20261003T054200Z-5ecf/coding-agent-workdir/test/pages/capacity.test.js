import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderCapacity } from '../../src/pages/capacity.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  resources: [
    { name: 'compute-eu-west-1', kind: 'compute', used: 27, total: 944, status: 'tight' },
    { name: 'memory-eu-west-1', kind: 'memory', used: 142, total: 496, status: 'ok' },
    { name: 'storage-eu-west-1', kind: 'storage', used: 517, total: 880, status: 'full' },
  ],
};

test('renders a row per resource', () => {
  const html = renderCapacity(snapshot);
  for (const r of snapshot.resources) assert.ok(html.includes(`<td>${r.name}</td>`), r.name);
});

test('colors status', () => {
  assert.ok(renderCapacity(snapshot).includes('<span class="pill pill-amber">tight</span>'));
});

test('says when there are none', () => {
  assert.ok(renderCapacity({ ...snapshot, resources: [] }).includes('<p class="muted">No resources.</p>'));
});
