import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderStatus } from '../../src/pages/status.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  components: [
    { name: 'API', group: 'Messaging', state: 'degraded' },
    { name: 'Dashboard', group: 'Core', state: 'operational' },
    { name: 'Webhooks', group: 'Messaging', state: 'operational' },
  ],
};

test('groups components by group', () => {
  const html = renderStatus(snapshot);
  assert.ok(html.indexOf('<h2>Core</h2>') < html.indexOf('<h2>Messaging</h2>'));
  assert.ok(html.includes('<p>1 components</p>'));
});

test('colors state', () => {
  assert.ok(renderStatus(snapshot).includes('<span class="pill pill-amber">degraded</span>'));
});
