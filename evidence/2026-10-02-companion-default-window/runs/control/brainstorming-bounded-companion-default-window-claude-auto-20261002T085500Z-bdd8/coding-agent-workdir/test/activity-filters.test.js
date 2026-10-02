// Run with `npm test`. The script pins TZ to a non-UTC zone so that a
// UTC-vs-local mix-up in the week logic shows up as a failure.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  matchesGroup,
  weekStart,
  addDays,
  listWeeks,
  filterEvents,
} = require('../public/activity-filters.js');

const MONDAY = 1;
const SUNDAY = 7;

const event = (type, when = '2026-09-24T12:00Z') => ({ type, when });

test('the "all" group matches every event type', () => {
  assert.equal(matchesGroup(event('Sign-out'), 'all'), true);
});

test('the "failed" group matches only failed sign-ins', () => {
  assert.equal(matchesGroup(event('Sign-in failed'), 'failed'), true);
  assert.equal(matchesGroup(event('Sign-in'), 'failed'), false);
});

test('the "security" group matches password, two-factor, and email changes', () => {
  for (const type of ['Password changed', 'Two-factor enabled', 'Email change requested']) {
    assert.equal(matchesGroup(event(type), 'security'), true, type);
  }
  assert.equal(matchesGroup(event('Settings updated'), 'security'), false);
  assert.equal(matchesGroup(event('Sign-in failed'), 'security'), false);
});

test('the "failed-security" group matches both failed sign-ins and security changes', () => {
  assert.equal(matchesGroup(event('Sign-in failed'), 'failed-security'), true);
  assert.equal(matchesGroup(event('Password changed'), 'failed-security'), true);
  assert.equal(matchesGroup(event('API token used'), 'failed-security'), false);
});

test('weekStart returns local midnight on the first day of the week', () => {
  // Thursday 24 Sep 2026, mid-afternoon local time.
  const thursday = new Date(2026, 8, 24, 15, 30);
  assert.deepEqual(weekStart(thursday, MONDAY), new Date(2026, 8, 21));
  assert.deepEqual(weekStart(thursday, SUNDAY), new Date(2026, 8, 20));
});

test('weekStart keeps a date that is already the first day of the week', () => {
  assert.deepEqual(weekStart(new Date(2026, 8, 21, 0, 0), MONDAY), new Date(2026, 8, 21));
});

test('weekStart uses the viewer time zone, not UTC', () => {
  // 03:00 UTC on Monday 21 Sep is still Sunday evening in Los Angeles,
  // so the event belongs to the week starting Monday 14 Sep there.
  assert.deepEqual(weekStart(new Date('2026-09-21T03:00Z'), MONDAY), new Date(2026, 8, 14));
});

test('addDays lands on local midnight across a DST change', () => {
  // US daylight saving time ends on Sunday 1 Nov 2026.
  assert.deepEqual(addDays(new Date(2026, 9, 26), 7), new Date(2026, 10, 2));
});

test('listWeeks covers every week from the newest event back to the oldest, newest first', () => {
  const events = [
    event('Sign-in', '2026-09-28T17:00Z'),
    event('Sign-in', '2026-09-10T12:00Z'),
  ];
  assert.deepEqual(listWeeks(events, MONDAY), [
    new Date(2026, 8, 28),
    new Date(2026, 8, 21),
    new Date(2026, 8, 14),
    new Date(2026, 8, 7),
  ]);
});

test('listWeeks returns no weeks when there are no events', () => {
  assert.deepEqual(listWeeks([], MONDAY), []);
});

test('filterEvents with no week keeps every event in the group, in order', () => {
  const events = [
    event('Sign-in failed', '2026-09-27T16:00Z'),
    event('Sign-in', '2026-09-26T16:00Z'),
    event('Sign-in failed', '2026-09-10T16:00Z'),
  ];
  assert.deepEqual(filterEvents(events, { group: 'failed', week: null }), [
    events[0],
    events[2],
  ]);
});

test('filterEvents with a week keeps only events inside that week', () => {
  const events = [
    event('Sign-in', '2026-09-28T17:00Z'),
    event('Sign-in', '2026-09-24T12:00Z'),
    event('Sign-in', '2026-09-21T03:00Z'), // Sunday 20 Sep in Los Angeles
  ];
  const week = new Date(2026, 8, 21).getTime();
  assert.deepEqual(filterEvents(events, { group: 'all', week }), [events[1]]);
});
