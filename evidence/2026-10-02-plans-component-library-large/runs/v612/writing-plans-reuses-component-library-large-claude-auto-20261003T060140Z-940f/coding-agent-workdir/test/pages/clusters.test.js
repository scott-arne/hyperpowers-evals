import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderClusters } from '../../src/pages/clusters.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  clusters: [
    { name: 'k8s-blue-01', region: 'us-east-1', version: '1.32.1', nodes: 20, status: 'degraded' },
    { name: 'k8s-green-02', region: 'eu-west-1', version: '1.31.4', nodes: 29, status: 'healthy' },
    { name: 'k8s-amber-03', region: 'us-east-1', version: '1.32.1', nodes: 17, status: 'healthy' },
  ],
};

test('groups clusters by region', () => {
  const html = renderClusters(snapshot);
  assert.ok(html.indexOf('<h2>eu-west-1</h2>') < html.indexOf('<h2>us-east-1</h2>'));
  assert.ok(html.includes('<p>1 clusters</p>'));
});

test('colors status', () => {
  assert.ok(renderClusters(snapshot).includes('<span class="pill pill-red">degraded</span>'));
});

test('links each panel', () => {
  assert.ok(renderClusters(snapshot).includes('href="/hosts?region=eu-west-1">View hosts<'));
});
