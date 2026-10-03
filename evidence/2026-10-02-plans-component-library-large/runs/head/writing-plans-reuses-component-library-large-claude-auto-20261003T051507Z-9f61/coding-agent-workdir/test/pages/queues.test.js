import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderQueues } from '../../src/pages/queues.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  queues: [
    { name: 'email-send', depth: 120, consumers: 0, oldest: '37m', status: 'backlog' },
    { name: 'webhook-deliver', depth: 9800, consumers: 7, oldest: '12m', status: 'ok' },
    { name: 'invoice-render', depth: 0, consumers: 2, oldest: '2m', status: 'backlog' },
  ],
};

test('renders a row per queue', () => {
  const html = renderQueues(snapshot, {});
  for (const q of snapshot.queues) assert.ok(html.includes(`<td>${q.name}</td>`), q.name);
});

test('colors status', () => {
  assert.ok(renderQueues(snapshot, {}).includes('<span class="pill pill-amber">backlog</span>'));
});

test('sorts by depth both ways', () => {
  const desc = renderQueues(snapshot, { sort: 'depth', dir: 'desc' });
  assert.ok(desc.indexOf('<td>webhook-deliver</td>') < desc.indexOf('<td>invoice-render</td>'));
  const asc = renderQueues(snapshot, { sort: 'depth' });
  assert.ok(asc.indexOf('<td>invoice-render</td>') < asc.indexOf('<td>webhook-deliver</td>'));
});

test('says when there are none', () => {
  assert.ok(renderQueues({ ...snapshot, queues: [] }, {}).includes('<p class="muted">No queues.</p>'));
});
