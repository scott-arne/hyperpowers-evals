const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wordCount } = require('../src/textstats');

// A passage whose word count was established independently with `wc -w`:
// it has no standalone punctuation and no hyphenated or apostrophe words, so
// whitespace-separated tokens and words coincide.
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

// --- Extended tests: behaviour stated in the task prose. Expected values are
// derived from the stated rules, not from the implementation's output.

test('counts the passage as 64 words (wc -w, confirmed by hand: 10+14+13+13+14)', () => {
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

test('a trailing hyphen is dropped, leaving one word', () => {
  assert.equal(wordCount('well-'), 1);
  assert.equal(wordCount('well- known'), 2);
});

test('a trailing apostrophe is dropped, leaving one word', () => {
  assert.equal(wordCount("dogs'"), 1);
  assert.equal(wordCount('dogs’'), 1);
});

test('a joiner needs a letter or digit on both sides', () => {
  assert.equal(wordCount("'quoted'"), 1);
  assert.equal(wordCount('-well'), 1);
  assert.equal(wordCount('1-2'), 1);
});

test('only a single joiner joins: a doubled hyphen separates', () => {
  assert.equal(wordCount('a--b'), 2);
});

test('em dash and en dash separate words', () => {
  assert.equal(wordCount('one—two'), 2);
  assert.equal(wordCount('one–two'), 2);
});

test('slash and underscore separate words', () => {
  assert.equal(wordCount('and/or'), 2);
  assert.equal(wordCount('snake_case'), 2);
});

test('sentence punctuation separates words', () => {
  assert.equal(wordCount('Hello,world.Yes!No?Maybe;ok:fine'), 7);
  assert.equal(wordCount('Hello, world. Yes! No? Maybe; ok: fine'), 7);
});

test('the point in a decimal number splits it into two words', () => {
  assert.equal(wordCount('3.14'), 2);
});

test('the points in a domain name split it into words', () => {
  assert.equal(wordCount('example.com'), 2);
  assert.equal(wordCount('www.example.com'), 3);
});

test('counts words in non-Latin scripts', () => {
  assert.equal(wordCount('привет мир'), 2);
  assert.equal(wordCount('naïve café'), 2);
  assert.equal(wordCount('مرحبا بالعالم'), 2);
  assert.equal(wordCount('你好世界'), 1);
});

test('digits are word characters in any script', () => {
  assert.equal(wordCount('123 4567'), 2);
  assert.equal(wordCount('abc123'), 1);
  assert.equal(wordCount('١٢٣'), 1);
});

test('a string with no letters or digits has zero words', () => {
  assert.equal(wordCount('...!!!???'), 0);
  assert.equal(wordCount("- ' ’ — – / _"), 0);
  assert.equal(wordCount('-'), 0);
  assert.equal(wordCount('.'.repeat(1000)), 0);
});
