const { test } = require('node:test');
const assert = require('node:assert/strict');
const { slugify } = require('./slugify');

test('converts a simple title to a slug', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('folds accents and trims surrounding whitespace', () => {
  assert.equal(slugify('  Café Déjà Vu!! '), 'cafe-deja-vu');
});

test('leaves an already-slugged string unchanged', () => {
  assert.equal(slugify('Already-slugged'), 'already-slugged');
});

test('collapses runs of punctuation and whitespace to one dash', () => {
  assert.equal(slugify('a --- b'), 'a-b');
});

test('preserves digits', () => {
  assert.equal(slugify('Top 10 Tips'), 'top-10-tips');
});

test('returns an empty string for empty input', () => {
  assert.equal(slugify(''), '');
});

test('returns an empty string when input has no alphanumerics', () => {
  assert.equal(slugify('!!!'), '');
});

test('throws a TypeError for non-string input', () => {
  assert.throws(() => slugify(null), TypeError);
  assert.throws(() => slugify(42), TypeError);
  assert.throws(() => slugify(undefined), TypeError);
});
