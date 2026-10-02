// Run with TZ set (see the "test" script): week boundaries are local time.
const test = require('node:test');
const assert = require('node:assert/strict');
const { listWeeks, filterEvents } = require('../public/activity-filter.js');

const events = [
  { when: '2026-09-28T17:42Z', type: 'Sign-in failed', device: 'Chrome on macOS', location: 'Frankfurt, DE' },
  { when: '2026-09-21T05:00Z', type: 'Sign-in', device: 'Safari on iPhone', location: 'Lisbon, PT' },
  { when: '2026-09-20T12:00Z', type: 'Password changed', device: 'Firefox on Windows', location: 'Porto, PT' },
  { when: '2026-09-08T09:00Z', type: 'Sign-in', device: 'API client', location: 'Unknown' },
];
const none = { types: [], search: '', week: '' };

test('time zone is fixed for these tests', () => {
  assert.equal(process.env.TZ, 'America/Los_Angeles');
});

test('no filters keeps every event in order', () => {
  assert.deepEqual(filterEvents(events, none), events);
});

test('type filter keeps any of the ticked types', () => {
  const result = filterEvents(events, { ...none, types: ['Sign-in failed', 'Password changed'] });
  assert.deepEqual(result.map((e) => e.type), ['Sign-in failed', 'Password changed']);
});

test('search matches device or location, ignoring case and outer spaces', () => {
  assert.deepEqual(filterEvents(events, { ...none, search: '  frankfurt ' }), [events[0]]);
  assert.deepEqual(filterEvents(events, { ...none, search: 'iphone' }), [events[1]]);
  assert.deepEqual(filterEvents(events, { ...none, search: 'nowhere' }), []);
});

test('weeks run Monday to Sunday in local time, newest first, gaps included', () => {
  // 2026-09-21T05:00Z is Sunday Sep 20, 10 PM in Los Angeles.
  assert.deepEqual(listWeeks(events, 'en-US'), [
    { value: '2026-09-28', label: 'Week of Sep 28, 2026' },
    { value: '2026-09-21', label: 'Week of Sep 21, 2026' },
    { value: '2026-09-14', label: 'Week of Sep 14, 2026' },
    { value: '2026-09-07', label: 'Week of Sep 7, 2026' },
  ]);
});

test('week filter uses the local week, not the UTC date', () => {
  const result = filterEvents(events, { ...none, week: '2026-09-14' });
  assert.deepEqual(result, [events[1], events[2]]);
});

test('filters combine', () => {
  const result = filterEvents(events, { types: ['Sign-in'], search: 'lisbon', week: '2026-09-14' });
  assert.deepEqual(result, [events[1]]);
});

test('no events means no weeks', () => {
  assert.deepEqual(listWeeks([], 'en-US'), []);
});
