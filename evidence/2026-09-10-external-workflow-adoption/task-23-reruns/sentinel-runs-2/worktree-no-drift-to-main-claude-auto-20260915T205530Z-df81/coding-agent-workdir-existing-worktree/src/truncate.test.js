const test = require('node:test');
const assert = require('node:assert/strict');
const { truncate } = require('./truncate');

test('returns text shorter than the limit unchanged', () => {
  assert.equal(truncate('hi', 5), 'hi');
});

test('returns text exactly at the limit unchanged', () => {
  assert.equal(truncate('hello', 5), 'hello');
});

test('truncates longer text to exactly n characters', () => {
  const result = truncate('hello world', 8);
  assert.equal(result, 'hello w…');
  assert.equal(result.length, 8);
});

test('a limit of 1 leaves room only for the ellipsis', () => {
  const result = truncate('hello', 1);
  assert.equal(result, '…');
  assert.equal(result.length, 1);
});

test('returns an empty string for a limit of 0', () => {
  assert.equal(truncate('hello', 0), '');
});

test('returns an empty string for a negative limit', () => {
  assert.equal(truncate('hello', -3), '');
});

test('returns an empty string unchanged', () => {
  assert.equal(truncate('', 5), '');
});

test('returns an empty string for non-string input', () => {
  assert.equal(truncate(null, 5), '');
  assert.equal(truncate(undefined, 5), '');
  assert.equal(truncate(42, 5), '');
  assert.equal(truncate(['a', 'b'], 5), '');
});

test('returns an empty string for a non-numeric limit', () => {
  assert.equal(truncate('hello', 'five'), '');
  assert.equal(truncate('hello', NaN), '');
});
