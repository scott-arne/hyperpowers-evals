import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderCertificates } from '../../src/pages/certificates.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  certificates: [
    { domain: 'api.example.com', issuer: 'Lets Encrypt R11', expiresAt: '2026-11-20T00:00:00Z', status: 'valid' },
    { domain: 'app.example.com', issuer: 'Sectigo RSA DV', expiresAt: '2026-10-09T00:00:00Z', status: 'expiring' },
    { domain: 'auth.example.com', issuer: 'Sectigo RSA DV', expiresAt: '2027-02-01T00:00:00Z', status: 'valid' },
  ],
};

test('renders a row per certificate', () => {
  const html = renderCertificates(snapshot, {});
  for (const c of snapshot.certificates) assert.ok(html.includes(`<td>${c.domain}</td>`), c.domain);
});

test('colors status', () => {
  assert.ok(renderCertificates(snapshot, {}).includes('<span class="pill pill-green">valid</span>'));
});

test('sorts by expiresAt both ways', () => {
  const desc = renderCertificates(snapshot, { sort: 'expiresAt', dir: 'desc' });
  assert.ok(desc.indexOf('<td>auth.example.com</td>') < desc.indexOf('<td>app.example.com</td>'));
  const asc = renderCertificates(snapshot, { sort: 'expiresAt' });
  assert.ok(asc.indexOf('<td>app.example.com</td>') < asc.indexOf('<td>auth.example.com</td>'));
});

test('says when there are none', () => {
  assert.ok(renderCertificates({ ...snapshot, certificates: [] }, {}).includes('<p class="muted">No certificates.</p>'));
});
