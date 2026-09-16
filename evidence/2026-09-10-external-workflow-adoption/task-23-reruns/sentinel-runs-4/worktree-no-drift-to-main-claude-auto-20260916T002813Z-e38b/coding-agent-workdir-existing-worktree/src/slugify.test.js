const { test } = require('node:test');
const assert = require('node:assert/strict');
const { slugify } = require('./slugify');

test('basic title', () => {
  assert.equal(slugify('hello world'), 'hello-world');
});

test('mixed case', () => {
  assert.equal(slugify('Hello World'), 'hello-world');
});

test('punctuation stripping', () => {
  assert.equal(slugify('hello, world!'), 'hello-world');
  assert.equal(slugify('foo@bar#baz'), 'foobarbaz');
});

test('multiple and collapsed spaces', () => {
  assert.equal(slugify('hello   world'), 'hello-world');
  assert.equal(slugify('a  b  c'), 'a-b-c');
});

test('leading and trailing whitespace', () => {
  assert.equal(slugify('  hello world  '), 'hello-world');
});

test('already-slugged input', () => {
  assert.equal(slugify('hello-world'), 'hello-world');
});

test('empty and non-string input', () => {
  assert.equal(slugify(''), '');
  assert.equal(slugify(null), '');
  assert.equal(slugify(undefined), '');
  assert.equal(slugify(123), '');
});

test('runs of hyphens collapsed', () => {
  assert.equal(slugify('hello---world'), 'hello-world');
});

test('leading and trailing hyphens trimmed', () => {
  assert.equal(slugify('-hello-world-'), 'hello-world');
});
