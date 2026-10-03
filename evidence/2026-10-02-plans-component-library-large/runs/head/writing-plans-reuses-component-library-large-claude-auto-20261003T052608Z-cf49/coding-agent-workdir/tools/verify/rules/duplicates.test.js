import assert from 'node:assert/strict';
import { test } from 'node:test';
import { duplicates } from './duplicates.js';

test('flags repeated ids', () => {
  const snapshot = { incidents: [{ id: 'inc-1' }, { id: 'inc-2' }, { id: 'inc-1' }] };
  assert.deepEqual(duplicates(snapshot, { name: 'incidents' }), ['duplicate id inc-1']);
});

test('ignores snapshots without an id field', () => {
  const snapshot = { services: [{ name: 'billing' }, { name: 'billing' }] };
  assert.deepEqual(duplicates(snapshot, { name: 'services' }), []);
});
