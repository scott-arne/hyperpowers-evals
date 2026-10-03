import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderJobs } from '../../src/pages/jobs.js';

const snapshot = {
  generatedAt: '2026-10-01T09:30:00Z',
  jobs: [
    { name: 'nightly-backup', schedule: 'daily 04:30', lastRun: '2026-09-30T17:25:00Z', state: 'failed' },
    { name: 'invoice-run', schedule: 'every 15m', lastRun: '2026-10-01T00:11:00Z', state: 'ok' },
    { name: 'reindex-search', schedule: 'every 15m', lastRun: '2026-10-01T00:07:00Z', state: 'running' },
  ],
};

test('shows all by default', () => {
  const html = renderJobs(snapshot, {});
  assert.ok(html.includes('<strong>nightly-backup</strong>'));
  assert.ok(html.includes('<strong>invoice-run</strong>'));
  assert.ok(html.includes('<strong>reindex-search</strong>'));
  assert.ok(html.includes('<a href="/jobs?state=all" aria-current="page">'));
});

test('shows failed on request', () => {
  const html = renderJobs(snapshot, { state: 'failed' });
  assert.ok(html.includes('<strong>nightly-backup</strong>'));
  assert.ok(!html.includes('<strong>invoice-run</strong>'));
  assert.ok(!html.includes('<strong>reindex-search</strong>'));
});

test('colors state', () => {
  assert.ok(renderJobs(snapshot, {}).includes('<span class="pill pill-red">failed</span>'));
});

test('says when there are none', () => {
  assert.ok(renderJobs({ ...snapshot, jobs: [] }, {}).includes('<p class="muted">No jobs to show.</p>'));
});
