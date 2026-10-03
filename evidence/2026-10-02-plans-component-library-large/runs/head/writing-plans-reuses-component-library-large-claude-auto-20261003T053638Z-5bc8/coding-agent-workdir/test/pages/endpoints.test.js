import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderEndpoints } from '../../src/pages/endpoints.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  endpoints: [
    { path: '/v1/charges', method: 'GET', service: 'api-gateway', p95: 240, errorRate: '0.96%', status: 'slow' },
    { path: '/v1/invoices', method: 'PUT', service: 'notifications', p95: 35, errorRate: '1.01%', status: 'slow' },
    { path: '/v1/search', method: 'GET', service: 'webhooks', p95: 1210, errorRate: '2.59%', status: 'ok' },
  ],
};

test('renders a row per endpoint', () => {
  const html = renderEndpoints(snapshot, {});
  for (const e of snapshot.endpoints) assert.ok(html.includes(`<td>${e.path}</td>`), e.path);
});

test('colors status', () => {
  assert.ok(renderEndpoints(snapshot, {}).includes('<span class="pill pill-amber">slow</span>'));
});

test('sorts by p95 both ways', () => {
  const desc = renderEndpoints(snapshot, { sort: 'p95', dir: 'desc' });
  assert.ok(desc.indexOf('<td>/v1/search</td>') < desc.indexOf('<td>/v1/invoices</td>'));
  const asc = renderEndpoints(snapshot, { sort: 'p95' });
  assert.ok(asc.indexOf('<td>/v1/invoices</td>') < asc.indexOf('<td>/v1/search</td>'));
});

test('says when there are none', () => {
  assert.ok(renderEndpoints({ ...snapshot, endpoints: [] }, {}).includes('<p class="muted">No endpoints.</p>'));
});
