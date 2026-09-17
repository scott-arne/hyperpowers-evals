const test = require('node:test');
const assert = require('node:assert/strict');

const { truncate } = require('./truncate');

test('returns text unchanged when shorter than n', () => {
  assert.equal(truncate('abc', 10), 'abc');
});

test('returns text unchanged when exactly n characters', () => {
  assert.equal(truncate('abcde', 5), 'abcde');
});

test('truncates to at most n characters including the ellipsis', () => {
  const result = truncate('abcdefghij', 5);
  assert.equal(result, 'ab...');
  assert.equal(result.length, 5);
  assert.ok(result.endsWith('...'));
});

test('hard cuts when n is smaller than the ellipsis length', () => {
  assert.equal(truncate('abcdefghij', 2), 'ab');
  assert.equal(truncate('abcdefghij', 1), 'a');
});

test('returns an empty string for n of 0 or negative', () => {
  assert.equal(truncate('abcdefghij', 0), '');
  assert.equal(truncate('abcdefghij', -3), '');
});

test('returns an empty string for nullish or non-string text', () => {
  assert.equal(truncate(null, 5), '');
  assert.equal(truncate(undefined, 5), '');
  assert.equal(truncate(12345678, 5), '');
});
