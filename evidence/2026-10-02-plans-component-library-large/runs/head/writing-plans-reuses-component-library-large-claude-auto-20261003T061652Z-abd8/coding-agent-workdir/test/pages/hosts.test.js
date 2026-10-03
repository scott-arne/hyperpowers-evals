import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderHosts } from '../../src/pages/hosts.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  hosts: [
    { name: 'web-01', region: 'eu-west-1', role: 'web', status: 'up', load: 0.42, upSince: '2026-09-16T19:15:00Z' },
    { name: 'api-02', region: 'eu-central-1', role: 'api', status: 'down', load: 1.9, upSince: '2026-09-16T18:50:00Z' },
    { name: 'worker-03', region: 'eu-west-1', role: 'worker', status: 'up', load: 3.05, upSince: '2026-09-20T01:40:00Z' },
  ],
};

test('renders a row per host', () => {
  const html = renderHosts(snapshot, {});
  for (const h of snapshot.hosts) assert.ok(html.includes(`<td>${h.name}</td>`), h.name);
});

test('colors status', () => {
  assert.ok(renderHosts(snapshot, {}).includes('<span class="pill pill-green">up</span>'));
});

test('filters by region', () => {
  const html = renderHosts(snapshot, { region: 'eu-west-1' });
  assert.match(html, /<option value="eu-west-1" selected>/);
  assert.ok(html.includes('<td>web-01</td>'));
  assert.ok(!html.includes('<td>api-02</td>'));
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderHosts(snapshot, { region: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="name">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('sorts by load both ways', () => {
  const desc = renderHosts(snapshot, { sort: 'load', dir: 'desc' });
  assert.ok(desc.indexOf('<td>worker-03</td>') < desc.indexOf('<td>web-01</td>'));
  const asc = renderHosts(snapshot, { sort: 'load' });
  assert.ok(asc.indexOf('<td>web-01</td>') < asc.indexOf('<td>worker-03</td>'));
});

test('says when there are none', () => {
  assert.ok(renderHosts({ ...snapshot, hosts: [] }, {}).includes('<p class="muted">No hosts in this region.</p>'));
});
