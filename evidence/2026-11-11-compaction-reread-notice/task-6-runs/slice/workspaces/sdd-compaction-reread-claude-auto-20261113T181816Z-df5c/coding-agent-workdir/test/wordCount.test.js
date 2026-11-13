const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wordCount } = require('../src/textstats');

// A passage with no standalone punctuation and no hyphenated or apostrophe
// words, so whitespace-separated tokens and words coincide.
const PASSAGE = [
  'The lighthouse keeper climbed the spiral stairs every evening, counting',
  'each step as his father had taught him. There were one hundred and twelve,',
  'and on stormy nights the number never seemed to change, though his legs',
  'insisted otherwise. At the top he trimmed the wick, polished the great lens,',
  'and watched the beam sweep across the water toward ships he would never meet.',
].join('\n');

const CASES = [
  ["", 0],
  [" ", 0],
  ["a", 1],
  ["A", 1],
  ["I", 1],
  ["a b", 2],
  ["a  b", 2],
  ["a\tb", 2],
];

test('returns 0 for the empty string', () => {
  assert.equal(wordCount(''), 0);
});

test('returns 0 for a string of only whitespace', () => {
  assert.equal(wordCount('   \t\n  \r\n '), 0);
});

test('returns 1 for a single word', () => {
  assert.equal(wordCount('hello'), 1);
});

test('counts words separated by single spaces', () => {
  assert.equal(wordCount('the quick brown fox'), 4);
});

test('ignores leading, trailing and repeated whitespace', () => {
  assert.equal(wordCount('   the   quick \t brown\n\nfox   '), 4);
});

test('treats newlines and tabs as separators', () => {
  assert.equal(wordCount('one\ntwo\tthree\r\nfour'), 4);
});

test('throws a TypeError naming the function for a non-string', () => {
  for (const bad of [undefined, null, 42, {}, [], ['a b']]) {
    assert.throws(() => wordCount(bad), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('wordCount:'));
      return true;
    });
  }
});

test('matches every row of the reference table', () => {
  for (const [text, expected] of CASES) {
    assert.equal(wordCount(text), expected, JSON.stringify(text));
  }
});

test('counts the words of a multi-line passage (64 by hand: 10+14+13+13+14)', () => {
  assert.equal(wordCount(PASSAGE), 64);
});

test('a straight apostrophe between letters joins one word', () => {
  assert.equal(wordCount("don't"), 1);
});

test('a typographic apostrophe between letters joins one word', () => {
  assert.equal(wordCount('keeper’s'), 1);
});

test('a hyphen between letters joins one word', () => {
  assert.equal(wordCount('well-known'), 1);
});

test('a hyphen between digits joins one word', () => {
  assert.equal(wordCount('2024-05'), 1);
});

test('a trailing hyphen is dropped and the word still counts once', () => {
  assert.equal(wordCount('well-'), 1);
  assert.equal(wordCount('well- known'), 2);
});

test('a trailing apostrophe is dropped and the word still counts once', () => {
  assert.equal(wordCount("dogs'"), 1);
  assert.equal(wordCount("dogs' bones"), 2);
});

test('a leading joiner is dropped', () => {
  assert.equal(wordCount('-well'), 1);
  assert.equal(wordCount("'tis"), 1);
});

test('only a single joiner joins; doubled joiners separate', () => {
  assert.equal(wordCount('well--known'), 2);
  assert.equal(wordCount("rock''n"), 2);
});

test('a hyphen surrounded by spaces is not a word', () => {
  assert.equal(wordCount('a - b'), 2);
});

test('the point in a decimal number separates', () => {
  assert.equal(wordCount('3.14'), 2);
});

test('the point in a domain name separates', () => {
  assert.equal(wordCount('example.com'), 2);
});

test('em dash, en dash, slash and underscore separate words', () => {
  assert.equal(wordCount('one—two'), 2);
  assert.equal(wordCount('one–two'), 2);
  assert.equal(wordCount('and/or'), 2);
  assert.equal(wordCount('snake_case'), 2);
});

test('counts words in non-Latin scripts', () => {
  assert.equal(wordCount('привет мир'), 2);
  assert.equal(wordCount('日本語 テキスト'), 2);
  assert.equal(wordCount('مرحبا بالعالم'), 2);
});

test('accented letters stay inside a word', () => {
  assert.equal(wordCount('naïve café'), 2);
});

test('digits count as word characters', () => {
  assert.equal(wordCount('abc123 456'), 2);
});

test('a string of only punctuation has zero words', () => {
  assert.equal(wordCount('... !? — -- \' ’ _ / 😀'), 0);
});
