import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderVendors } from '../../src/pages/vendors.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  vendors: [
    { name: 'Stripe', category: 'paging', status: 'degraded', checkedAt: '2026-10-01T09:25:00Z', statusPage: 'https://status.stripe.example.com' },
    { name: 'Twilio', category: 'source', status: 'operational', checkedAt: '2026-10-01T09:23:00Z', statusPage: 'https://status.twilio.example.com' },
    { name: 'SendGrid', category: 'source', status: 'outage', checkedAt: '2026-10-01T09:24:00Z', statusPage: 'https://status.sendgrid.example.com' },
  ],
};

test('lists vendors by name', () => {
  const html = renderVendors(snapshot);
  assert.ok(html.indexOf('<strong>SendGrid</strong>') < html.indexOf('<strong>Twilio</strong>'));
});

test('colors status', () => {
  assert.ok(renderVendors(snapshot).includes('<span class="pill pill-amber">degraded</span>'));
});

test('links each one', () => {
  assert.ok(renderVendors(snapshot).includes('href="https://status.stripe.example.com">Status page<'));
});

test('says when there are none', () => {
  assert.ok(renderVendors({ ...snapshot, vendors: [] }).includes('<p class="muted">No vendors.</p>'));
});
