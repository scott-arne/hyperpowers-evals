const { test } = require('node:test');
const assert = require('node:assert/strict');
const { truncate } = require('./truncate');

test('returns short input untouched', () => {
  assert.equal(truncate('hello', 10), 'hello');
});

test('returns exact-length input untouched', () => {
  assert.equal(truncate('hello', 5), 'hello');
});

test('truncates with a single-character ellipsis', () => {
  assert.equal(truncate('abcdef', 5), 'abcd…');
  assert.equal(truncate('hello world', 8), 'hello w…');
});

test('a budget of 1 leaves room for the ellipsis only', () => {
  assert.equal(truncate('abc', 1), '…');
});

test('returns empty string for a non-positive budget', () => {
  assert.equal(truncate('abc', 0), '');
  assert.equal(truncate('abc', -3), '');
});

test('handles an empty string', () => {
  assert.equal(truncate('', 5), '');
});

test('result length never exceeds n', () => {
  const result = truncate('abcdef', 5);
  assert.ok(result.length <= 5);
  assert.equal(result.length, 5);
});

test('throws TypeError when text is not a string', () => {
  assert.throws(() => truncate(null, 5), TypeError);
  assert.throws(() => truncate(42, 5), TypeError);
});

test('throws TypeError when n is not an integer', () => {
  assert.throws(() => truncate('abc', '5'), TypeError);
  assert.throws(() => truncate('abc', 2.5), TypeError);
  assert.throws(() => truncate('abc', NaN), TypeError);
});
