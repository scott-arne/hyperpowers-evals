const test = require('node:test');
const assert = require('node:assert');
const { truncate } = require('./truncate');

test('returns text unchanged when it fits', () => {
  assert.strictEqual(truncate('hello', 10), 'hello');
});

test('returns text unchanged when it exactly fits', () => {
  assert.strictEqual(truncate('hello', 5), 'hello');
});

test('truncates with an ellipsis inside the budget', () => {
  assert.strictEqual(truncate('hello world', 8), 'hello w…');
  assert.strictEqual(truncate('hello world', 8).length, 8);
});

test('strips trailing whitespace from the slice, which may shorten the result', () => {
  assert.strictEqual(truncate('hello world', 7), 'hello…');
  assert.strictEqual(truncate('hello world', 7).length, 6);
});

test('a budget of one yields just the ellipsis', () => {
  assert.strictEqual(truncate('hello', 1), '…');
});

test('uses U+2026 rather than three dots', () => {
  assert.strictEqual(truncate('hello world', 8).endsWith('…'), true);
  assert.strictEqual(truncate('hello world', 8).includes('...'), false);
});

test('a slice of only whitespace collapses to the ellipsis', () => {
  assert.strictEqual(truncate('   hello', 3), '…');
});

test('returns the empty string for a zero or negative budget', () => {
  assert.strictEqual(truncate('hello', 0), '');
  assert.strictEqual(truncate('hello', -1), '');
  assert.strictEqual(truncate('hello', -10), '');
});

test('returns the empty string for a non-integer or non-finite budget', () => {
  assert.strictEqual(truncate('hello', 2.5), '');
  assert.strictEqual(truncate('hello', NaN), '');
  assert.strictEqual(truncate('hello', Infinity), '');
  assert.strictEqual(truncate('hello', -Infinity), '');
});

test('returns the empty string for a non-number budget', () => {
  assert.strictEqual(truncate('hello', '5'), '');
  assert.strictEqual(truncate('hello', undefined), '');
  assert.strictEqual(truncate('hello', null), '');
  assert.strictEqual(truncate('hello', {}), '');
  assert.strictEqual(truncate('hello'), '');
});

test('returns the empty string for non-string text', () => {
  assert.strictEqual(truncate(null, 5), '');
  assert.strictEqual(truncate(undefined, 5), '');
  assert.strictEqual(truncate(12345, 5), '');
  assert.strictEqual(truncate({}, 5), '');
  assert.strictEqual(truncate(['hello'], 5), '');
  assert.strictEqual(truncate(new String('hello'), 5), '');
});

test('handles the empty string', () => {
  assert.strictEqual(truncate('', 5), '');
  assert.strictEqual(truncate('', 0), '');
});

test('never returns a result longer than the budget', () => {
  const text = 'the quick brown fox jumps over the lazy dog';
  for (let n = 1; n <= text.length + 5; n += 1) {
    assert.ok(
      truncate(text, n).length <= n,
      `truncate(text, ${n}) exceeded its budget`
    );
  }
});
