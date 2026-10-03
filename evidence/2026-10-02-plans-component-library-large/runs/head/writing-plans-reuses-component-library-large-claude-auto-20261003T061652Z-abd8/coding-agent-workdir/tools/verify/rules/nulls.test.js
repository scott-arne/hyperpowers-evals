import assert from 'node:assert/strict';
import { test } from 'node:test';
import { nulls } from './nulls.js';

test('flags a field that is null everywhere', () => {
  const row = { id: 'inc-1', title: 't', service: 's', severity: 'sev1', openedAt: '2026-10-01T00:00:00Z', resolvedAt: null, runbook: 'r' };
  const snapshot = { incidents: [row, { ...row, id: 'inc-2' }] };
  assert.deepEqual(nulls(snapshot, { name: 'incidents' }), ['resolvedAt is null in every row']);
});
