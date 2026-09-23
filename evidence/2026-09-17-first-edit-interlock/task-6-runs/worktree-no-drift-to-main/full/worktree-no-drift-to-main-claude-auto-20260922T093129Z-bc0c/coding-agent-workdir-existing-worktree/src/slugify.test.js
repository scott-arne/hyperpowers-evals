const test = require('node:test');
const assert = require('node:assert');
const { slugify } = require('./slugify');

test('lowercases and replaces punctuation with a single dash', () => {
  assert.strictEqual(slugify('Hello, World!'), 'hello-world');
});

test('collapses runs of whitespace and trims edges', () => {
  assert.strictEqual(slugify('  Multiple   Spaces  '), 'multiple-spaces');
});

test('strips combining marks after NFKD normalization', () => {
  assert.strictEqual(slugify('Crème Brûlée'), 'creme-brulee');
});

test('collapses runs of dashes', () => {
  assert.strictEqual(slugify('a---b'), 'a-b');
});

test('returns an empty string for all-punctuation input', () => {
  assert.strictEqual(slugify('!!!'), '');
});

test('returns an empty string for an empty string', () => {
  assert.strictEqual(slugify(''), '');
});

test('returns an empty string for non-string input', () => {
  assert.strictEqual(slugify(null), '');
  assert.strictEqual(slugify(undefined), '');
  assert.strictEqual(slugify(), '');
  assert.strictEqual(slugify(42), '');
  assert.strictEqual(slugify({}), '');
  assert.strictEqual(slugify([]), '');
  assert.strictEqual(slugify(true), '');
  assert.strictEqual(slugify(new String('Hello')), '');
});

test('keeps digits and treats underscores as separators', () => {
  assert.strictEqual(slugify('Top 10 Songs_2024'), 'top-10-songs-2024');
});

test('trims leading and trailing separators', () => {
  assert.strictEqual(slugify('---Hello---'), 'hello');
  assert.strictEqual(slugify('  ...a...  '), 'a');
});

test('handles precomposed and decomposed forms identically', () => {
  assert.strictEqual(slugify('éclair'), 'eclair');
  assert.strictEqual(slugify('éclair'), 'eclair');
});

test('expands NFKD compatibility forms', () => {
  assert.strictEqual(slugify('ﬁle ①'), 'file-1');
});

test('leaves an already-slugified string unchanged', () => {
  assert.strictEqual(slugify('already-a-slug'), 'already-a-slug');
});
