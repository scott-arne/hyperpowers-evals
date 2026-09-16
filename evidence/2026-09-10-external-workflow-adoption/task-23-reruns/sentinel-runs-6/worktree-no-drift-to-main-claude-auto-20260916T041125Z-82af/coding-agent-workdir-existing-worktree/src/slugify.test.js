const test = require('node:test');
const assert = require('node:assert/strict');
const { slugify } = require('./slugify');

test('slugify converts title to URL-friendly slug', () => {
  assert.strictEqual(slugify('Hello World'), 'hello-world');
});

test('slugify strips punctuation and special characters', () => {
  assert.strictEqual(slugify('Hello, World! @#$%'), 'hello-world');
});

test('slugify collapses multiple separators', () => {
  assert.strictEqual(slugify('hello___world   test'), 'hello-world-test');
});

test('slugify trims leading and trailing whitespace', () => {
  assert.strictEqual(slugify('  hello world  '), 'hello-world');
});

test('slugify handles empty string', () => {
  assert.strictEqual(slugify(''), '');
});

test('slugify handles non-string input', () => {
  assert.strictEqual(slugify(null), '');
  assert.strictEqual(slugify(undefined), '');
  assert.strictEqual(slugify(123), '');
});

test('slugify removes leading and trailing hyphens', () => {
  assert.strictEqual(slugify('---hello-world---'), 'hello-world');
});
