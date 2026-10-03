import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderWebhooks } from '../../src/pages/webhooks.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  webhooks: [
    { name: 'hooli-refunds-0', url: 'https://hooks.hooli.example.com/in', events: 'charge.*', lastDelivery: '2026-09-30T19:01:00Z', status: 'failing' },
    { name: 'globex-invoices-1', url: 'https://hooks.globex.example.com/in', events: 'invoice.paid', lastDelivery: '2026-09-30T22:15:00Z', status: 'healthy' },
    { name: 'wonka-invoices-2', url: 'https://hooks.wonka.example.com/in', events: 'invoice.paid', lastDelivery: '2026-09-29T14:04:00Z', status: 'paused' },
  ],
};

test('renders a row per webhook', () => {
  const html = renderWebhooks(snapshot);
  for (const w of snapshot.webhooks) assert.ok(html.includes(`<td>${w.name}</td>`), w.name);
});

test('colors status', () => {
  assert.ok(renderWebhooks(snapshot).includes('<span class="pill pill-red">failing</span>'));
});

test('says when there are none', () => {
  assert.ok(renderWebhooks({ ...snapshot, webhooks: [] }).includes('<p class="muted">No webhooks.</p>'));
});
