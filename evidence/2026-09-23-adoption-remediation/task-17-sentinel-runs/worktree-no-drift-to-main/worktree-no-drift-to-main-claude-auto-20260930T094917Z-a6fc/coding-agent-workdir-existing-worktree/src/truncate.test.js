const test = require('node:test');
const assert = require('node:assert');
const { truncate } = require('./truncate');

test('returns text unchanged when length is within limit', () => {
  assert.strictEqual(truncate('hello', 10), 'hello');
  assert.strictEqual(truncate('hello', 5), 'hello');
});

test('truncates text longer than n with ellipsis', () => {
  const result = truncate('abcdefg', 5);
  assert.strictEqual(result, 'ab...');
  assert.strictEqual(result.length, 5);
});

test('normal case: long sentence truncates to exactly n characters', () => {
  const result = truncate('The quick brown fox jumps over the lazy dog', 20);
  assert.strictEqual(result, 'The quick brown f...');
  assert.strictEqual(result.length, 20);
});

test('n exactly equal to text length returns unchanged', () => {
  assert.strictEqual(truncate('test', 4), 'test');
});

test('n smaller than ellipsis length (0, 1, 2) truncates without ellipsis', () => {
  assert.strictEqual(truncate('hello', 0), '');
  assert.strictEqual(truncate('hello', 0).length, 0);

  assert.strictEqual(truncate('hello', 1), 'h');
  assert.strictEqual(truncate('hello', 1).length, 1);

  assert.strictEqual(truncate('hello', 2), 'he');
  assert.strictEqual(truncate('hello', 2).length, 2);
});

test('n equal to 3 truncates without ellipsis', () => {
  assert.strictEqual(truncate('hello', 3), 'hel');
  assert.strictEqual(truncate('hello', 3).length, 3);
});

test('n equal to 4 uses ellipsis', () => {
  const result = truncate('hello', 4);
  assert.strictEqual(result, 'h...');
  assert.strictEqual(result.length, 4);
});

test('negative n returns empty string', () => {
  assert.strictEqual(truncate('hello', -1), '');
  assert.strictEqual(truncate('hello', -100), '');
});

test('non-integer n uses floor', () => {
  assert.strictEqual(truncate('hello world', 7.9), 'hell...');
  assert.strictEqual(truncate('hello world', 7.9).length, 7);
});

test('empty string input returns empty string', () => {
  assert.strictEqual(truncate('', 5), '');
});

test('non-string text converts to string', () => {
  assert.strictEqual(truncate(12345, 3), '123');
  assert.strictEqual(truncate(null, 5), 'null');
  assert.strictEqual(truncate(undefined, 10), 'undefined');
});

test('missing or non-numeric n treats as no truncation', () => {
  assert.strictEqual(truncate('hello'), 'hello');
  assert.strictEqual(truncate('hello', 'bad'), 'hello');
  assert.strictEqual(truncate('hello', null), 'hello');
});
