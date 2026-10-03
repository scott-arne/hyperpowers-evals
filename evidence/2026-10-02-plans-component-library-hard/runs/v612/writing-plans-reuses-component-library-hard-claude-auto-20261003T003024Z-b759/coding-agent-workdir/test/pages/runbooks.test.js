import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderRunbooks } from '../../src/pages/runbooks.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  runbooks: [
    { id: 'queue-backlog', title: 'Queue backlog', summary: 'Scale the workers.', url: 'https://wiki.example.com/runbooks/queue-backlog' },
    { id: 'gateway-errors', title: 'Gateway errors', summary: 'Shed load.', url: 'https://wiki.example.com/runbooks/gateway-errors' },
  ],
};

test('lists runbooks by title, each with an anchor and a link', () => {
  const html = renderRunbooks(snapshot);
  assert.ok(html.indexOf('Gateway errors') < html.indexOf('Queue backlog'));
  assert.match(html, /<section class="panel" id="queue-backlog">/);
  assert.match(html, /href="https:\/\/wiki\.example\.com\/runbooks\/queue-backlog">Open runbook</);
});
