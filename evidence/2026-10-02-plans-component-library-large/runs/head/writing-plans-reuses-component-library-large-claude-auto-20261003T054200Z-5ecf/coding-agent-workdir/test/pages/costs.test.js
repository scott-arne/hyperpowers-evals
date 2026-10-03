import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderCosts } from '../../src/pages/costs.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  budgets: [
    { service: 'api-gateway', team: 'payments', budget: '$1900', spent: '$1196', status: 'over' },
    { service: 'billing', team: 'platform', budget: '$3700', spent: '$2896', status: 'under' },
    { service: 'notifications', team: 'payments', budget: '$6700', spent: '$7285', status: 'near' },
  ],
};

test('groups budgets by team', () => {
  const html = renderCosts(snapshot);
  assert.ok(html.indexOf('<h2>payments</h2>') < html.indexOf('<h2>platform</h2>'));
  assert.ok(html.includes('<p>2 services</p>'));
});

test('colors status', () => {
  assert.ok(renderCosts(snapshot).includes('<span class="pill pill-red">over</span>'));
});
