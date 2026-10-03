import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderSecrets } from '../../src/pages/secrets.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  secrets: [
    { name: 'db-billing-password', store: 'kms', rotatedAt: '2026-05-28T14:52:00Z', rotateBy: '2026-10-14T20:05:00Z', status: 'overdue' },
    { name: 'stripe-api-key', store: 'vault', rotatedAt: '2026-07-06T01:03:00Z', rotateBy: '2026-10-12T18:04:00Z', status: 'ok' },
    { name: 'smtp-password', store: 'vault', rotatedAt: '2026-09-28T05:24:00Z', rotateBy: '2026-10-06T14:40:00Z', status: 'due' },
  ],
};

test('renders a row per secret', () => {
  const html = renderSecrets(snapshot);
  for (const s of snapshot.secrets) assert.ok(html.includes(`<td>${s.name}</td>`), s.name);
});

test('colors status', () => {
  assert.ok(renderSecrets(snapshot).includes('<span class="pill pill-red">overdue</span>'));
});

test('says when there are none', () => {
  assert.ok(renderSecrets({ ...snapshot, secrets: [] }).includes('<p class="muted">No secrets.</p>'));
});
