import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderTeams } from '../../src/pages/teams.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  teams: [
    { name: 'platform', area: 'product', lead: 'dana', members: 7, channel: '#team-platform', staffing: 'short' },
    { name: 'payments', area: 'infrastructure', lead: 'marco', members: 5, channel: '#team-payments', staffing: 'staffed' },
    { name: 'messaging', area: 'product', lead: 'sam', members: 9, channel: '#team-messaging', staffing: 'staffed' },
  ],
};

test('groups teams by area', () => {
  const html = renderTeams(snapshot);
  assert.ok(html.indexOf('<h2>infrastructure</h2>') < html.indexOf('<h2>product</h2>'));
  assert.ok(html.includes('<p>1 teams</p>'));
});

test('colors staffing', () => {
  assert.ok(renderTeams(snapshot).includes('<span class="pill pill-amber">short</span>'));
});
