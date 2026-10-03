import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderFlags } from '../../src/pages/flags.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  flags: [
    { name: 'fast-onboarding-0', environment: 'production', state: 'partial', rollout: '100%', owner: 'grace', updatedAt: '2026-09-29T10:00:00Z' },
    { name: 'fast-onboarding-1', environment: 'staging', state: 'on', rollout: '100%', owner: 'aiko', updatedAt: '2026-10-01T07:00:00Z' },
    { name: 'new-billing-ui-2', environment: 'production', state: 'off', rollout: '5%', owner: 'priya', updatedAt: '2026-09-15T12:00:00Z' },
  ],
};

test('renders a row per flag', () => {
  const html = renderFlags(snapshot, {});
  for (const f of snapshot.flags) assert.ok(html.includes(`<td>${f.name}</td>`), f.name);
});

test('colors state', () => {
  assert.ok(renderFlags(snapshot, {}).includes('<span class="pill pill-amber">partial</span>'));
});

test('filters by environment', () => {
  const html = renderFlags(snapshot, { environment: 'production' });
  assert.match(html, /<option value="production" selected>/);
  assert.ok(html.includes('<td>fast-onboarding-0</td>'));
  assert.ok(!html.includes('<td>fast-onboarding-1</td>'));
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderFlags(snapshot, { environment: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="name">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('sorts by updatedAt both ways', () => {
  const desc = renderFlags(snapshot, { sort: 'updatedAt', dir: 'desc' });
  assert.ok(desc.indexOf('<td>fast-onboarding-1</td>') < desc.indexOf('<td>new-billing-ui-2</td>'));
  const asc = renderFlags(snapshot, { sort: 'updatedAt' });
  assert.ok(asc.indexOf('<td>new-billing-ui-2</td>') < asc.indexOf('<td>fast-onboarding-1</td>'));
});

test('says when there are none', () => {
  assert.ok(renderFlags({ ...snapshot, flags: [] }, {}).includes('<p class="muted">No flags in this environment.</p>'));
});
