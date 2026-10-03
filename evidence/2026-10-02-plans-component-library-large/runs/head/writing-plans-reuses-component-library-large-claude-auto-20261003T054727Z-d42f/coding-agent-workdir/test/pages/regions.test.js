import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderRegions } from '../../src/pages/regions.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  regions: [
    { name: 'eu-west-1', provider: 'gcp', services: 3, status: 'outage' },
    { name: 'eu-central-1', provider: 'aws', services: 12, status: 'operational' },
    { name: 'us-east-1', provider: 'aws', services: 11, status: 'degraded' },
  ],
};

test('groups regions by provider', () => {
  const html = renderRegions(snapshot);
  assert.ok(html.indexOf('<h2>aws</h2>') < html.indexOf('<h2>gcp</h2>'));
  assert.ok(html.includes('<p>2 regions</p>'));
});

test('colors status', () => {
  assert.ok(renderRegions(snapshot).includes('<span class="pill pill-red">outage</span>'));
});
