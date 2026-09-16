const test = require('node:test');
const assert = require('node:assert/strict');
const { truncate } = require('./truncate');

test('returns text unchanged when length is less than n', () => {
  assert.equal(truncate('hello', 10), 'hello');
});

test('returns text unchanged when length equals n', () => {
  assert.equal(truncate('hello', 5), 'hello');
});

test('truncates text to exactly n characters with ellipsis', () => {
  const result = truncate('hello world', 8);
  assert.equal(result, 'hello...');
  assert.equal(result.length, 8);
});

test('truncates long text correctly', () => {
  const result = truncate('the quick brown fox jumps over the lazy dog', 20);
  assert.equal(result, 'the quick brown f...');
  assert.equal(result.length, 20);
});

test('handles n equal to ellipsis length (3)', () => {
  const result = truncate('hello world', 3);
  assert.equal(result, '...');
  assert.equal(result.length, 3);
});

test('handles n = 2', () => {
  const result = truncate('hello', 2);
  assert.equal(result, '..');
  assert.equal(result.length, 2);
});

test('handles n = 1', () => {
  const result = truncate('hello', 1);
  assert.equal(result, '.');
  assert.equal(result.length, 1);
});

test('handles n = 0', () => {
  assert.equal(truncate('hello', 0), '');
});

test('handles negative n', () => {
  assert.equal(truncate('hello', -5), '');
});

test('handles empty string', () => {
  assert.equal(truncate('', 10), '');
  assert.equal(truncate('', 0), '');
});

test('handles null input', () => {
  assert.equal(truncate(null, 10), '');
});

test('handles undefined input', () => {
  assert.equal(truncate(undefined, 10), '');
});

test('converts number to string', () => {
  assert.equal(truncate(12345, 3), '...');
  assert.equal(truncate(42, 10), '42');
});
