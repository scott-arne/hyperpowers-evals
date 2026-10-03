import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderSlos } from '../../src/pages/slos.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  slos: [
    { name: 'api-gateway-availability', service: 'api-gateway', target: '99.95%', current: '99.24%', budgetLeft: 64, status: 'met' },
    { name: 'billing-availability', service: 'billing', target: '99.9%', current: '99.52%', budgetLeft: -4, status: 'breached' },
    { name: 'notifications-latency', service: 'notifications', target: '99.5%', current: '99.79%', budgetLeft: 12, status: 'at-risk' },
  ],
};

test('renders a row per slo', () => {
  const html = renderSlos(snapshot, {});
  for (const s of snapshot.slos) assert.ok(html.includes(`<td>${s.name}</td>`), s.name);
});

test('colors status', () => {
  assert.ok(renderSlos(snapshot, {}).includes('<span class="pill pill-green">met</span>'));
});

test('sorts by budgetLeft both ways', () => {
  const desc = renderSlos(snapshot, { sort: 'budgetLeft', dir: 'desc' });
  assert.ok(desc.indexOf('<td>api-gateway-availability</td>') < desc.indexOf('<td>billing-availability</td>'));
  const asc = renderSlos(snapshot, { sort: 'budgetLeft' });
  assert.ok(asc.indexOf('<td>billing-availability</td>') < asc.indexOf('<td>api-gateway-availability</td>'));
});

test('says when there are none', () => {
  assert.ok(renderSlos({ ...snapshot, slos: [] }, {}).includes('<p class="muted">No objectives.</p>'));
});
