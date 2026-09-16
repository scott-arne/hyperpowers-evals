const test = require('node:test');
const assert = require('node:assert/strict');
const { truncate } = require('./truncate');

test('returns text unchanged when shorter than limit', () => {
  assert.equal(truncate('hello', 10), 'hello');
});

test('returns text unchanged when exactly at limit', () => {
  assert.equal(truncate('hello', 5), 'hello');
});

test('truncates text longer than limit', () => {
  const result = truncate('hello world', 8);
  assert.equal(result, 'hello...');
  assert.ok(result.length <= 8);
  assert.ok(result.endsWith('...'));
});

test('handles limit smaller than ellipsis', () => {
  const result = truncate('hello', 2);
  assert.equal(result, '..');
  assert.ok(result.length <= 2);
});

test('handles limit equal to ellipsis length', () => {
  const result = truncate('hello world', 3);
  assert.equal(result, '...');
});

test('returns empty string for non-string text', () => {
  assert.equal(truncate(123, 10), '');
  assert.equal(truncate(null, 10), '');
  assert.equal(truncate(undefined, 10), '');
});

test('returns empty string for non-positive limit', () => {
  assert.equal(truncate('hello', 0), '');
  assert.equal(truncate('hello', -5), '');
});

test('returns empty string for non-numeric limit', () => {
  assert.equal(truncate('hello', 'ten'), '');
  assert.equal(truncate('hello', null), '');
});
