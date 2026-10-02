// Run with: TZ=Europe/Lisbon node --test test/
// The page scripts are plain browser scripts, so load them into a sandbox
// with a window object instead of importing them.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(file, sandbox) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'public', file), 'utf8'), sandbox);
}

const sandbox = { window: {} };
load('activity-data.js', sandbox);
load('activity-filters.js', sandbox);
const { filterEvents, weekStartsOf } = sandbox.window.ActivityFilters;
const events = sandbox.window.ACTIVITY_EVENTS;

const types = (list) => [...new Set(list.map((e) => e.type))].sort();

test('no filters returns every event in order', () => {
  assert.deepEqual(filterEvents(events, { type: '', week: '' }), events);
});

test('failed sign-ins preset keeps only failed sign-ins', () => {
  const result = filterEvents(events, { type: 'group:failed', week: '' });
  assert.equal(result.length, 8);
  assert.deepEqual(types(result), ['Sign-in failed']);
});

test('security changes preset excludes settings updated', () => {
  const result = filterEvents(events, { type: 'group:security', week: '' });
  assert.deepEqual(types(result), ['Email change requested', 'Password changed', 'Two-factor enabled']);
});

test('a single event type keeps only that type', () => {
  const result = filterEvents(events, { type: 'type:Settings updated', week: '' });
  assert.deepEqual(types(result), ['Settings updated']);
});

test('weeks start on Monday in the viewer time zone, newest first', () => {
  const starts = weekStartsOf(events).map((ms) => new Date(ms));
  assert.ok(starts.length > 1);
  for (const start of starts) {
    assert.equal(start.getDay(), 1);
    assert.equal(start.getHours(), 0);
    assert.equal(start.getMinutes(), 0);
  }
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i] < starts[i - 1]);
});

test('every event falls in exactly one listed week', () => {
  const starts = weekStartsOf(events);
  let total = 0;
  for (const week of starts) total += filterEvents(events, { type: '', week: String(week) }).length;
  assert.equal(total, events.length);
});

test('a week keeps only events from Monday through Sunday of that week', () => {
  // Monday Sep 21 2026, local midnight.
  const week = new Date(2026, 8, 21).getTime();
  const result = filterEvents(events, { type: '', week: String(week) });
  assert.ok(result.length > 0);
  for (const e of result) {
    const when = new Date(e.when).getTime();
    assert.ok(when >= week && when < new Date(2026, 8, 28).getTime(), e.when);
  }
});

test('type and week filters combine', () => {
  const week = new Date(2026, 8, 21).getTime();
  const result = filterEvents(events, { type: 'group:failed', week: String(week) });
  assert.ok(result.length > 0);
  assert.deepEqual(types(result), ['Sign-in failed']);
  assert.ok(result.length < filterEvents(events, { type: 'group:failed', week: '' }).length);
});
