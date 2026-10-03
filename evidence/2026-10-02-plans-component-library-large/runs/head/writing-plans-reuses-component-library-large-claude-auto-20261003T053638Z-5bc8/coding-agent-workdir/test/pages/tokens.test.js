import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderTokens } from '../../src/pages/tokens.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  tokens: [
    { name: 'ci-deploy', owner: 'lee', scopes: 'admin', lastUsed: '2026-09-26T18:51:00Z', expiresAt: '2027-03-19T21:34:00Z', status: 'revoked' },
    { name: 'grafana-read', owner: 'tomas', scopes: 'admin', lastUsed: '2026-09-18T18:08:00Z', expiresAt: '2027-01-12T11:36:00Z', status: 'active' },
    { name: 'pager-sync', owner: 'lee', scopes: 'admin', lastUsed: '2026-09-24T01:21:00Z', expiresAt: '2027-03-21T19:56:00Z', status: 'expiring' },
  ],
};

test('renders a row per token', () => {
  const html = renderTokens(snapshot);
  for (const t of snapshot.tokens) assert.ok(html.includes(`<td>${t.name}</td>`), t.name);
});

test('colors status', () => {
  assert.ok(renderTokens(snapshot).includes('<span class="pill pill-grey">revoked</span>'));
});

test('says when there are none', () => {
  assert.ok(renderTokens({ ...snapshot, tokens: [] }).includes('<p class="muted">No tokens.</p>'));
});
