const { test } = require('node:test');
const assert = require('node:assert');
const { truncate } = require('./truncate');

test('returns text unchanged when shorter than limit', () => {
  assert.strictEqual(truncate('hello', 10), 'hello');
});

test('returns text unchanged when exactly at limit', () => {
  assert.strictEqual(truncate('hello', 5), 'hello');
});

test('truncates text longer than limit', () => {
  const result = truncate('hello world', 8);
  assert.strictEqual(result, 'hello...');
  assert.strictEqual(result.length, 8);
});

test('handles tiny n values', () => {
  assert.strictEqual(truncate('hello', 2), '..');
  assert.strictEqual(truncate('hello', 1), '.');
  assert.strictEqual(truncate('hello', 0), '');
  assert.strictEqual(truncate('hello', -1), '');
});

test('handles empty input', () => {
  assert.strictEqual(truncate('', 10), '');
});

test('handles non-string input', () => {
  assert.strictEqual(truncate(null, 10), '');
  assert.strictEqual(truncate(undefined, 10), '');
  assert.strictEqual(truncate(123, 10), '');
});
