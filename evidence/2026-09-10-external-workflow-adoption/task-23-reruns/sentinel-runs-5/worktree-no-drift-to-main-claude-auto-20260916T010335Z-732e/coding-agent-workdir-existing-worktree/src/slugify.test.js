const test = require('node:test');
const assert = require('node:assert');
const { slugify } = require('./slugify');

test('slugifies a simple title', () => {
  assert.strictEqual(slugify('Hello World'), 'hello-world');
});

test('strips mixed punctuation', () => {
  assert.strictEqual(slugify('Hello, World! & Friends?'), 'hello-world-friends');
});

test('collapses extra, leading, and trailing whitespace', () => {
  assert.strictEqual(slugify('   Spaced   Out   Title  '), 'spaced-out-title');
});

test('leaves already-slugified input unchanged', () => {
  assert.strictEqual(slugify('already-slugified-title'), 'already-slugified-title');
});

test('collapses repeated and edge hyphens', () => {
  assert.strictEqual(slugify('--Draft---Post--'), 'draft-post');
});

test('returns an empty string for empty or invalid input', () => {
  assert.strictEqual(slugify(''), '');
  assert.strictEqual(slugify('   '), '');
  assert.strictEqual(slugify(null), '');
  assert.strictEqual(slugify(undefined), '');
  assert.strictEqual(slugify(42), '');
  assert.strictEqual(slugify({}), '');
});
