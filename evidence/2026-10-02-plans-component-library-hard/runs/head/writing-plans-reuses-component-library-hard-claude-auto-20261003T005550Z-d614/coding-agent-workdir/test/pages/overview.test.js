import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderOverview } from '../../src/pages/overview.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  services: [
    { name: 'a', version: '1', environment: 'production', health: 'failing', deployedAt: '2026-09-01T00:00:00Z' },
    { name: 'b', version: '1', environment: 'production', health: 'passing', deployedAt: '2026-09-01T00:00:00Z' },
    { name: 'a', version: '2', environment: 'staging', health: 'passing', deployedAt: '2026-09-02T00:00:00Z' },
  ],
};

test('counts the services not passing in each environment', () => {
  const html = renderOverview(snapshot);
  assert.match(html, /<span class="pill pill-red">1 not passing<\/span>/);
  assert.match(html, /<span class="pill pill-green">all passing<\/span>/);
  assert.match(html, /href="\/services\?env=staging">View services</);
});
