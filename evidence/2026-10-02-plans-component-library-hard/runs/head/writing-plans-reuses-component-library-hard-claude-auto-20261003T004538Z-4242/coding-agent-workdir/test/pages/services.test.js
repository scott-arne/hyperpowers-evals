import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderServices } from '../../src/pages/services.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  services: [
    { name: 'billing', version: '2.8.0', environment: 'production', health: 'failing', deployedAt: '2026-09-29T11:40:00Z' },
    { name: 'api', version: '3.1.0', environment: 'production', health: 'passing', deployedAt: '2026-09-30T16:05:00Z' },
  ],
};

test('lists services by name by default', () => {
  const html = renderServices(snapshot, {});
  assert.ok(html.indexOf('<td>api</td>') < html.indexOf('<td>billing</td>'));
  assert.match(html, /<th aria-sort="ascending"><a href="\?env=all&amp;sort=name&amp;dir=desc">Name ▲<\/a><\/th>/);
});

test('sorts by deploy time both ways and keeps the sort in the filter form', () => {
  const newest = renderServices(snapshot, { sort: 'deployedAt', dir: 'desc' });
  assert.ok(newest.indexOf('<td>api</td>') < newest.indexOf('<td>billing</td>'));
  assert.match(newest, /<th aria-sort="descending"><a href="\?env=all&amp;sort=deployedAt&amp;dir=asc">Deployed ▼<\/a><\/th>/);
  assert.match(newest, /<input type="hidden" name="sort" value="deployedAt">/);
  assert.match(newest, /<input type="hidden" name="dir" value="desc">/);
  const oldest = renderServices(snapshot, { sort: 'deployedAt' });
  assert.ok(oldest.indexOf('<td>billing</td>') < oldest.indexOf('<td>api</td>'));
});

test('colors health', () => {
  assert.match(renderServices(snapshot, {}), /<span class="pill pill-red">failing<\/span>/);
});

test('filters by environment, keeps it when sorting, and says when none match', () => {
  const production = renderServices(snapshot, { env: 'production' });
  assert.match(production, /href="\?env=production&amp;sort=deployedAt&amp;dir=asc"/);
  const staging = renderServices(snapshot, { env: 'staging' });
  assert.match(staging, /<option value="staging" selected>/);
  assert.match(staging, /No services in this environment\./);
  assert.doesNotMatch(staging, /<table/);
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderServices(snapshot, { env: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="name">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('explains the health states in a dialog', () => {
  const html = renderServices(snapshot, {});
  assert.match(html, /data-dialog-open="health-legend"/);
  assert.match(html, /<dialog class="kit-dialog" id="health-legend"/);
});
