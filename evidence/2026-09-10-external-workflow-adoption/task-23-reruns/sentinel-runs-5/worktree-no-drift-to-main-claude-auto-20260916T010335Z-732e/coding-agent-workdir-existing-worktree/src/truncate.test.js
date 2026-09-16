const test = require('node:test');
const assert = require('node:assert');
const { truncate } = require('./truncate');

test('returns text unchanged when shorter than n', () => {
  assert.strictEqual(truncate('hello', 10), 'hello');
});

test('returns text unchanged when exactly n characters', () => {
  assert.strictEqual(truncate('hello', 5), 'hello');
});

test('shortens longer text to exactly n characters including the ellipsis', () => {
  const result = truncate('hello world', 8);
  assert.strictEqual(result, 'hello w…');
  assert.strictEqual(result.length, 8);
});

test('handles a very small n', () => {
  assert.strictEqual(truncate('hello', 1), '…');
  assert.strictEqual(truncate('hello', 2), 'h…');
});

test('returns an empty string for non-string text', () => {
  assert.strictEqual(truncate(undefined, 5), '');
  assert.strictEqual(truncate(null, 5), '');
  assert.strictEqual(truncate(42, 5), '');
  assert.strictEqual(truncate(['hello'], 5), '');
});

test('returns an empty string when n is not a positive number', () => {
  assert.strictEqual(truncate('hello', 0), '');
  assert.strictEqual(truncate('hello', -3), '');
  assert.strictEqual(truncate('hello', '5'), '');
  assert.strictEqual(truncate('hello', NaN), '');
  assert.strictEqual(truncate('hello', undefined), '');
});
