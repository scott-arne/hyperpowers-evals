const test = require('node:test');
const assert = require('node:assert/strict');

const { slugify } = require('./slugify');

test('slugifies a plain title', () => {
  assert.equal(slugify('hello world'), 'hello-world');
});

test('lowercases mixed case', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('collapses punctuation and symbols into single hyphens', () => {
  assert.equal(slugify('Hello, World! & Friends?'), 'hello-world-friends');
});

test('collapses multiple, leading, and trailing spaces', () => {
  assert.equal(slugify('  Hello   World  '), 'hello-world');
});

test('leaves an already-slugged string unchanged', () => {
  assert.equal(slugify('hello-world'), 'hello-world');
});

test('returns an empty string for an empty input', () => {
  assert.equal(slugify(''), '');
});

test('returns an empty string for a non-string input', () => {
  assert.equal(slugify(null), '');
  assert.equal(slugify(undefined), '');
  assert.equal(slugify(42), '');
});
