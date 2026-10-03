import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderAlerts } from '../../src/pages/alerts.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  alerts: [
    { name: 'high-error-rate', service: 'reports', severity: 'critical', state: 'acknowledged', firedAt: '2026-10-01T08:12:00Z' },
    { name: 'p95-latency', service: 'api-gateway', severity: 'warning', state: 'silenced', firedAt: '2026-09-30T22:40:00Z' },
    { name: 'disk-almost-full', service: 'api-gateway', severity: 'critical', state: 'acknowledged', firedAt: '2026-10-01T09:01:00Z' },
  ],
};

test('renders a row per alert', () => {
  const html = renderAlerts(snapshot, {});
  for (const a of snapshot.alerts) assert.ok(html.includes(`<td>${a.name}</td>`), a.name);
});

test('colors severity', () => {
  assert.ok(renderAlerts(snapshot, {}).includes('<span class="pill pill-red">critical</span>'));
});

test('filters by severity', () => {
  const html = renderAlerts(snapshot, { severity: 'critical' });
  assert.match(html, /<option value="critical" selected>/);
  assert.ok(html.includes('<td>high-error-rate</td>'));
  assert.ok(!html.includes('<td>p95-latency</td>'));
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderAlerts(snapshot, { severity: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="name">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('sorts by firedAt both ways', () => {
  const desc = renderAlerts(snapshot, { sort: 'firedAt', dir: 'desc' });
  assert.ok(desc.indexOf('<td>disk-almost-full</td>') < desc.indexOf('<td>p95-latency</td>'));
  const asc = renderAlerts(snapshot, { sort: 'firedAt' });
  assert.ok(asc.indexOf('<td>p95-latency</td>') < asc.indexOf('<td>disk-almost-full</td>'));
});

test('says when there are none', () => {
  assert.ok(renderAlerts({ ...snapshot, alerts: [] }, {}).includes('<p class="muted">No alerts at this severity.</p>'));
});
