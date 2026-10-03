import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderReports } from '../../src/pages/reports.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  reports: [
    { id: 'rep-40', title: 'Weekly ops review 40', period: 'week', owner: 'grace', publishedAt: '2026-10-01T08:00:00Z', state: 'draft', url: 'https://wiki.example.com/reports/rep-40' },
    { id: 'rep-41', title: 'Cost review 39', period: 'week', owner: 'aiko', publishedAt: '2026-09-24T08:00:00Z', state: 'published', url: 'https://wiki.example.com/reports/rep-41' },
    { id: 'rep-42', title: 'Incident summary 38', period: 'week', owner: 'aiko', publishedAt: '2026-09-17T08:00:00Z', state: 'published', url: 'https://wiki.example.com/reports/rep-42' },
  ],
};

test('lists reports newest first', () => {
  const html = renderReports(snapshot);
  assert.ok(html.indexOf('<strong>Weekly ops review 40</strong>') < html.indexOf('<strong>Incident summary 38</strong>'));
});

test('colors state', () => {
  assert.ok(renderReports(snapshot).includes('<span class="pill pill-grey">draft</span>'));
});

test('links each one', () => {
  assert.ok(renderReports(snapshot).includes('href="https://wiki.example.com/reports/rep-40">Open<'));
});

test('says when there are none', () => {
  assert.ok(renderReports({ ...snapshot, reports: [] }).includes('<p class="muted">No reports yet.</p>'));
});
