import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderOncall } from '../../src/pages/oncall.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  rotations: [
    { team: 'platform', primary: 'dana', secondary: 'marco', until: '2026-10-05T09:00:00Z' },
    { team: 'messaging', primary: 'marco', secondary: 'dana', until: '2026-10-03T09:00:00Z' },
  ],
  escalation: ['Page the primary.', 'Then the secondary.'],
};

test('lists rotations by team', () => {
  const html = renderOncall(snapshot);
  assert.ok(html.indexOf('<td>messaging</td>') < html.indexOf('<td>platform</td>'));
});

test('shows the escalation policy in a dialog', () => {
  const html = renderOncall(snapshot);
  assert.match(html, /data-dialog-open="escalation"/);
  assert.match(html, /<li>Page the primary\.<\/li><li>Then the secondary\.<\/li>/);
});
