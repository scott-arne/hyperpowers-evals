const test = require('node:test');
const assert = require('node:assert/strict');

const { slugify } = require('./slugify');

test('converts a normal title with spaces', () => {
  assert.equal(slugify('hello world'), 'hello-world');
});

test('lowercases mixed case input', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('replaces punctuation with hyphens', () => {
  assert.equal(slugify('Hello, World! (again)'), 'hello-world-again');
});

test('trims leading and trailing whitespace', () => {
  assert.equal(slugify('   Spaced Out   '), 'spaced-out');
});

test('collapses consecutive separators into a single hyphen', () => {
  assert.equal(slugify('a --  b___c'), 'a-b-c');
});

test('strips diacritics', () => {
  assert.equal(slugify('Crème Brûlée'), 'creme-brulee');
});

test('returns an empty string for an empty input', () => {
  assert.equal(slugify(''), '');
});

test('returns an empty string for all-punctuation input', () => {
  assert.equal(slugify('!!! ---'), '');
});

test('returns an empty string for nullish or non-string input', () => {
  assert.equal(slugify(null), '');
  assert.equal(slugify(undefined), '');
  assert.equal(slugify(42), '');
  assert.equal(slugify({}), '');
});
