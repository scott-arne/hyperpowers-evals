import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderIncidents } from '../../src/pages/incidents.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  incidents: [
    { id: 'inc-2', title: 'Emails delayed', service: 'notifications', severity: 'sev2', openedAt: '2026-10-01T08:40:00Z', resolvedAt: null, runbook: 'queue-backlog' },
    { id: 'inc-1', title: 'Gateway 502s', service: 'api-gateway', severity: 'sev1', openedAt: '2026-09-27T21:10:00Z', resolvedAt: '2026-09-27T21:48:00Z', runbook: 'gateway-errors' },
  ],
};

test('shows open incidents by default, each with its runbook', () => {
  const html = renderIncidents(snapshot, {});
  assert.match(html, /Emails delayed/);
  assert.doesNotMatch(html, /Gateway 502s/);
  assert.match(html, /<span class="pill pill-amber">sev2<\/span>/);
  assert.match(html, /href="\/runbooks#queue-backlog">Runbook</);
  assert.match(html, /<a href="\/incidents\?state=open" aria-current="page">Open<\/a>/);
});

test('shows resolved incidents on request', () => {
  const html = renderIncidents(snapshot, { state: 'resolved' });
  assert.match(html, /Gateway 502s/);
  assert.match(html, /<span class="pill pill-red">sev1<\/span>/);
});

test('says when there are none', () => {
  assert.match(renderIncidents({ ...snapshot, incidents: [] }, {}), /No open incidents\./);
});
