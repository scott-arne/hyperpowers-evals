const test = require('node:test');
const assert = require('node:assert');

const { slugify } = require('./slugify');

test('converts a simple title to a slug', () => {
  assert.strictEqual(slugify('Hello World'), 'hello-world');
});

test('lowercases uppercase input', () => {
  assert.strictEqual(slugify('LOUD TITLE'), 'loud-title');
});

test('trims surrounding whitespace', () => {
  assert.strictEqual(slugify('   spaced out   '), 'spaced-out');
});

test('strips characters that are not alphanumeric, whitespace, or hyphen', () => {
  assert.strictEqual(slugify('Hello, World! (2024)'), 'hello-world-2024');
});

test('keeps digits', () => {
  assert.strictEqual(slugify('Top 10 Tips'), 'top-10-tips');
});

test('collapses runs of whitespace into a single hyphen', () => {
  assert.strictEqual(slugify('too    many     spaces'), 'too-many-spaces');
});

test('collapses runs of hyphens into a single hyphen', () => {
  assert.strictEqual(slugify('already---hyphenated'), 'already-hyphenated');
});

test('collapses mixed runs of whitespace and hyphens', () => {
  assert.strictEqual(slugify('mixed - _ separators'), 'mixed-separators');
});

test('treats tabs and newlines as whitespace', () => {
  assert.strictEqual(slugify('tab\tand\nnewline'), 'tab-and-newline');
});

test('removes leading and trailing hyphens', () => {
  assert.strictEqual(slugify('---edge case---'), 'edge-case');
});

test('removes hyphens left behind by stripped punctuation at the edges', () => {
  assert.strictEqual(slugify('!!!Wow!!!'), 'wow');
});

test('returns an empty string for an empty input', () => {
  assert.strictEqual(slugify(''), '');
});

test('returns an empty string for whitespace-only input', () => {
  assert.strictEqual(slugify('   \t\n  '), '');
});

test('returns an empty string for all-punctuation input', () => {
  assert.strictEqual(slugify('!@#$%^&*()'), '');
});

test('returns an empty string for hyphen-only input', () => {
  assert.strictEqual(slugify('---'), '');
});

test('throws a TypeError for non-string input', () => {
  assert.throws(() => slugify(42), TypeError);
  assert.throws(() => slugify(null), TypeError);
  assert.throws(() => slugify(undefined), TypeError);
  assert.throws(() => slugify(['a']), TypeError);
  assert.throws(() => slugify({}), TypeError);
});

test('does not mutate or depend on surrounding calls', () => {
  assert.strictEqual(slugify('Repeatable Title'), 'repeatable-title');
  assert.strictEqual(slugify('Repeatable Title'), 'repeatable-title');
});
