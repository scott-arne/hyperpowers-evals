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

test('counts the words in a multi-line passage', () => {
  // Hand-counted per line: 10 + 14 + 13 + 13 + 14 = 64 (matches `wc -w`).
  assert.equal(wordCount(PASSAGE), 64);
});

test('treats a straight apostrophe between letters as part of one word', () => {
  assert.equal(wordCount("don't"), 1);
  assert.equal(wordCount("don't stop"), 2);
});

test('treats a typographic apostrophe between letters as part of one word', () => {
  assert.equal(wordCount('keeper’s'), 1);
  assert.equal(wordCount('the keeper’s lamp'), 3);
});

test('treats a hyphen between letters as part of one word', () => {
  assert.equal(wordCount('well-known'), 1);
  assert.equal(wordCount('a well-known fact'), 3);
});

test('treats a hyphen or apostrophe between digits as part of one word', () => {
  assert.equal(wordCount('2024-11-04'), 1);
  assert.equal(wordCount("rock'n'roll 80's"), 2);
});

test('drops a stray trailing joiner', () => {
  assert.equal(wordCount('well-'), 1);
  assert.equal(wordCount("dogs'"), 1);
  assert.equal(wordCount('well- dogs’ bark'), 3);
});

test('drops a stray leading joiner', () => {
  assert.equal(wordCount('-well'), 1);
  assert.equal(wordCount("'tis"), 1);
});

test('does not let a joiner bridge a space', () => {
  assert.equal(wordCount('well - known'), 2);
  assert.equal(wordCount("dogs ' bark"), 2);
});

test('does not let doubled joiners join two runs', () => {
  assert.equal(wordCount('well--known'), 2);
  assert.equal(wordCount("don''t"), 2);
  assert.equal(wordCount("a-'b"), 2);
});

test('splits the point in a decimal number into two words', () => {
  assert.equal(wordCount('3.14'), 2);
  assert.equal(wordCount('pi is 3.14'), 4);
});

test('splits a domain name at its point', () => {
  assert.equal(wordCount('example.com'), 2);
  assert.equal(wordCount('visit example.com today'), 4);
});

test('treats em dashes, en dashes, slashes and underscores as separators', () => {
  assert.equal(wordCount('one—two'), 2);
  assert.equal(wordCount('one–two'), 2);
  assert.equal(wordCount('and/or'), 2);
  assert.equal(wordCount('snake_case'), 2);
});

test('treats sentence punctuation as a separator', () => {
  assert.equal(wordCount('Hello, world! Really? Yes; ok: (fine) "quoted".'), 7);
});

test('returns 0 for a long string with no letters or digits', () => {
  assert.equal(wordCount('-- ... !!! ??? —— // ___ \' ’ ' .repeat(50)), 0);
});

test('counts digits as word characters', () => {
  assert.equal(wordCount('42'), 1);
  assert.equal(wordCount('room 101 b2'), 3);
});

test('counts words in non-Latin scripts', () => {
  assert.equal(wordCount('café naïve'), 2);
  assert.equal(wordCount('привет мир'), 2);
  assert.equal(wordCount('こんにちは 世界'), 2);
  assert.equal(wordCount('κόσμος-ειρήνη'), 1);
});
