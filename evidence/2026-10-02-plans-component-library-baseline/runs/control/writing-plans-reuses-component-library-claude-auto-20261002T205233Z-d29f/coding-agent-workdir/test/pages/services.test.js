import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderServices } from '../../src/pages/services.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  services: [
    { name: 'billing', version: '2.8.0', environment: 'production', health: 'failing', deployedAt: '2026-09-29T11:40:00Z' },
    { name: 'api', version: '3.1.0', environment: 'production', health: 'passing', deployedAt: '2026-09-30T16:05:00Z' },
  ],
};

test('lists services by name by default', () => {
  const html = renderServices(snapshot, {});
  assert.ok(html.indexOf('<td>api</td>') < html.indexOf('<td>billing</td>'));
});

test('sorts newest deploy first', () => {
  const html = renderServices(snapshot, { sort: 'deployedAt' });
  assert.ok(html.indexOf('<td>api</td>') < html.indexOf('<td>billing</td>'));
  assert.match(html, /<input type="hidden" name="sort" value="deployedAt">/);
});

test('colors health', () => {
  assert.match(renderServices(snapshot, {}), /<span class="pill pill-red">failing<\/span>/);
});

test('filters by environment and says when none match', () => {
  const html = renderServices(snapshot, { env: 'staging' });
  assert.match(html, /<option value="staging" selected>/);
  assert.match(html, /No services in this environment\./);
  assert.doesNotMatch(html, /<table/);
});

test('falls back to all environments for an unknown env', () => {
  assert.match(renderServices(snapshot, { env: 'moon' }), /<option value="all" selected>/);
});
