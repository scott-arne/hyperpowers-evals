const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesFilters } = require('../public/activity-filters.js');

const failedSignIn = { when: '2026-09-27T16:03Z', type: 'Sign-in failed' };
const passwordChanged = { when: '2026-09-27T11:50Z', type: 'Password changed' };

test('shows an event whose type is selected', () => {
  const filters = { types: new Set(['Sign-in failed']) };
  assert.equal(matchesFilters(failedSignIn, filters), true);
});

test('hides an event whose type is not selected', () => {
  const filters = { types: new Set(['Sign-in failed']) };
  assert.equal(matchesFilters(passwordChanged, filters), false);
});

test('hides every event when no type is selected', () => {
  const filters = { types: new Set() };
  assert.equal(matchesFilters(failedSignIn, filters), false);
});
