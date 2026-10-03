import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDomains } from '../../src/pages/domains.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  domains: [
    { name: 'example.com', registrar: 'Gandi', expiresAt: '2027-06-23T21:15:00Z', dns: 'misconfigured' },
    { name: 'example.net', registrar: 'Gandi', expiresAt: '2026-11-25T18:09:00Z', dns: 'ok' },
    { name: 'example.io', registrar: 'Namecheap', expiresAt: '2027-06-05T03:43:00Z', dns: 'ok' },
  ],
};

test('renders a row per domain', () => {
  const html = renderDomains(snapshot);
  for (const d of snapshot.domains) assert.ok(html.includes(`<td>${d.name}</td>`), d.name);
});

test('colors dns', () => {
  assert.ok(renderDomains(snapshot).includes('<span class="pill pill-red">misconfigured</span>'));
});

test('says when there are none', () => {
  assert.ok(renderDomains({ ...snapshot, domains: [] }).includes('<p class="muted">No domains.</p>'));
});
