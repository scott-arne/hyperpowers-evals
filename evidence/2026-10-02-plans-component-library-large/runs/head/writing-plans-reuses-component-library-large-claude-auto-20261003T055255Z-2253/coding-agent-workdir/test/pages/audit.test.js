import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderAudit } from '../../src/pages/audit.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  entries: [
    { at: '2026-10-01T09:07:00Z', actor: 'dana', action: 'deploy', target: 'media', result: 'denied' },
    { at: '2026-10-01T08:41:00Z', actor: 'priya', action: 'config', target: 'webhooks', result: 'ok' },
    { at: '2026-10-01T07:55:00Z', actor: 'lee', action: 'deploy', target: 'billing', result: 'ok' },
  ],
};

test('renders a row per entry', () => {
  const html = renderAudit(snapshot, {});
  for (const e of snapshot.entries) assert.ok(html.includes(`<td>${e.at}</td>`), e.at);
});

test('colors result', () => {
  assert.ok(renderAudit(snapshot, {}).includes('<span class="pill pill-red">denied</span>'));
});

test('filters by action', () => {
  const html = renderAudit(snapshot, { action: 'deploy' });
  assert.match(html, /<option value="deploy" selected>/);
  assert.ok(html.includes('<td>2026-10-01T09:07:00Z</td>'));
  assert.ok(!html.includes('<td>2026-10-01T08:41:00Z</td>'));
});

test('falls back to the defaults for unknown query values', () => {
  const html = renderAudit(snapshot, { action: 'moon', sort: 'constructor', dir: 'sideways' });
  assert.match(html, /<option value="all" selected>/);
  assert.match(html, /<input type="hidden" name="sort" value="at">/);
  assert.match(html, /<input type="hidden" name="dir" value="asc">/);
});

test('sorts by actor both ways', () => {
  const desc = renderAudit(snapshot, { sort: 'actor', dir: 'desc' });
  assert.ok(desc.indexOf('<td>2026-10-01T08:41:00Z</td>') < desc.indexOf('<td>2026-10-01T09:07:00Z</td>'));
  const asc = renderAudit(snapshot, { sort: 'actor' });
  assert.ok(asc.indexOf('<td>2026-10-01T09:07:00Z</td>') < asc.indexOf('<td>2026-10-01T08:41:00Z</td>'));
});

test('says when there are none', () => {
  assert.ok(renderAudit({ ...snapshot, entries: [] }, {}).includes('<p class="muted">No entries for this action.</p>'));
});
