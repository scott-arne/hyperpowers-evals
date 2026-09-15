const test = require('node:test');
const assert = require('node:assert');

const { truncate } = require('./truncate');

test('returns text unchanged when shorter than the limit', () => {
  assert.strictEqual(truncate('hello', 10), 'hello');
});

test('returns text unchanged at length n - 1', () => {
  assert.strictEqual(truncate('abcdefghi', 10), 'abcdefghi');
});

test('returns text unchanged at length n', () => {
  assert.strictEqual(truncate('abcdefghij', 10), 'abcdefghij');
});

test('truncates at length n + 1 to exactly n characters', () => {
  const result = truncate('abcdefghijk', 10);
  assert.strictEqual(result, 'abcdefg...');
  assert.strictEqual(result.length, 10);
});

test('truncates a longer sentence to exactly n characters', () => {
  const result = truncate('Hello, world!', 8);
  assert.strictEqual(result, 'Hello...');
  assert.strictEqual(result.length, 8);
});

test('the ellipsis fits within the budget rather than overflowing it', () => {
  for (const n of [4, 5, 6, 7, 20]) {
    const result = truncate('the quick brown fox jumps over the lazy dog', n);
    assert.strictEqual(result.length, n);
    assert.ok(result.endsWith('...'));
  }
});

test('returns a partial ellipsis when n is smaller than the ellipsis', () => {
  assert.strictEqual(truncate('abcdef', 3), '...');
  assert.strictEqual(truncate('abcdef', 2), '..');
  assert.strictEqual(truncate('abcdef', 1), '.');
});

test('short text is still returned unchanged when n is tiny', () => {
  assert.strictEqual(truncate('ab', 2), 'ab');
  assert.strictEqual(truncate('', 0), '');
});

test('returns an empty string for n of zero or negative', () => {
  assert.strictEqual(truncate('abcdef', 0), '');
  assert.strictEqual(truncate('abcdef', -5), '');
});

test('handles an empty string', () => {
  assert.strictEqual(truncate('', 5), '');
});

test('throws a TypeError for non-string text', () => {
  assert.throws(() => truncate(42, 5), TypeError);
  assert.throws(() => truncate(null, 5), TypeError);
  assert.throws(() => truncate(undefined, 5), TypeError);
  assert.throws(() => truncate(['a'], 5), TypeError);
});

test('throws a TypeError for a non-number or non-finite limit', () => {
  assert.throws(() => truncate('abcdef', '5'), TypeError);
  assert.throws(() => truncate('abcdef', NaN), TypeError);
  assert.throws(() => truncate('abcdef', Infinity), TypeError);
  assert.throws(() => truncate('abcdef'), TypeError);
});
