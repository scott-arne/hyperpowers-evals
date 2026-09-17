import test from 'node:test';
import assert from 'node:assert/strict';

import { setCurrentUser, getCurrentUser, clearCurrentUser } from '../src/session.mjs';

test('a freshly loaded session has no current user', async () => {
  // A separate module instance, so the assertion cannot be affected by the
  // state other tests in this file leave behind.
  const fresh = await import('../src/session.mjs?fresh-instance');
  assert.equal(fresh.getCurrentUser(), null);
});

test('getCurrentUser returns the user recorded by setCurrentUser', () => {
  setCurrentUser({ userId: 'stub-alice', username: 'alice' });
  assert.deepEqual(getCurrentUser(), { userId: 'stub-alice', username: 'alice' });
});

test('setCurrentUser replaces a previously recorded user', () => {
  setCurrentUser({ userId: 'stub-alice', username: 'alice' });
  setCurrentUser({ userId: 'stub-bob', username: 'bob' });
  assert.deepEqual(getCurrentUser(), { userId: 'stub-bob', username: 'bob' });
});

test('clearCurrentUser removes the recorded user', () => {
  setCurrentUser({ userId: 'stub-bob', username: 'bob' });
  clearCurrentUser();
  assert.equal(getCurrentUser(), null);
});

// The session state is reachable only through this module's three functions.
// Handing out or holding on to a caller's object would break that.

test('mutating the object returned by getCurrentUser does not change the session', () => {
  setCurrentUser({ userId: 'stub-alice', username: 'alice' });
  getCurrentUser().username = 'mallory';
  assert.equal(getCurrentUser().username, 'alice');
});

test('mutating the object passed to setCurrentUser does not change the session', () => {
  const incoming = { userId: 'stub-alice', username: 'alice' };
  setCurrentUser(incoming);
  incoming.username = 'mallory';
  assert.equal(getCurrentUser().username, 'alice');
});
