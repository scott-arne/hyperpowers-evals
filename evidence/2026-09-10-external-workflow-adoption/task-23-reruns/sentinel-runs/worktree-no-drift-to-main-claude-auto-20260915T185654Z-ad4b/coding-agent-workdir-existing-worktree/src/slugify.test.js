const { test } = require('node:test');
const assert = require('node:assert');
const { slugify } = require('./slugify');

test('slugify converts normal text to slug', () => {
  assert.strictEqual(slugify('Hello, World!'), 'hello-world');
});

test('slugify handles multiple spaces', () => {
  assert.strictEqual(slugify('  Multiple   Spaces  '), 'multiple-spaces');
});

test('slugify handles already slugged text', () => {
  assert.strictEqual(slugify('Already-Slugged'), 'already-slugged');
});

test('slugify strips leading and trailing separators', () => {
  assert.strictEqual(slugify('--Leading and Trailing--'), 'leading-and-trailing');
});

test('slugify handles punctuation-only input', () => {
  assert.strictEqual(slugify('!!!'), '');
});

test('slugify handles empty string', () => {
  assert.strictEqual(slugify(''), '');
});

test('slugify handles whitespace-only string', () => {
  assert.strictEqual(slugify('   '), '');
});

test('slugify handles non-string input', () => {
  assert.strictEqual(slugify(null), '');
  assert.strictEqual(slugify(undefined), '');
  assert.strictEqual(slugify(123), '');
});
