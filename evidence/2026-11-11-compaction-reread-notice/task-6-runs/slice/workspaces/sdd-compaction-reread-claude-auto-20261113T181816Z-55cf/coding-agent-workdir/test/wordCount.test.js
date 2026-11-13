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

// Added: behaviours specified in the brief's prose but not tested by its file.

test('counts the reference passage as 64 words (wc -w)', () => {
  assert.equal(wordCount(PASSAGE), 64);
});

test('joins letters with a straight apostrophe into one word', () => {
  assert.equal(wordCount("don't"), 1);
});

test('joins letters with a typographic apostrophe into one word', () => {
  assert.equal(wordCount('keeper’s'), 1);
});

test('joins letters with a single hyphen into one word', () => {
  assert.equal(wordCount('well-known'), 1);
});

test('drops a trailing hyphen: "well-" is the word "well"', () => {
  assert.equal(wordCount('well-'), 1);
});

test('drops a trailing apostrophe: "dogs\'" is the word "dogs"', () => {
  assert.equal(wordCount("dogs'"), 1);
});

test('does not join across a leading or doubled joiner', () => {
  assert.equal(wordCount('-well'), 1);
  assert.equal(wordCount('a--b'), 2);
});

test('treats em and en dashes as separators', () => {
  assert.equal(wordCount('one—two'), 2);
  assert.equal(wordCount('one–two'), 2);
});

test('treats slashes and underscores as separators', () => {
  assert.equal(wordCount('and/or'), 2);
  assert.equal(wordCount('snake_case'), 2);
});

test('splits a decimal number at the point: 3.14 is two words', () => {
  assert.equal(wordCount('3.14'), 2);
});

test('splits a domain name at the point: example.com is two words', () => {
  assert.equal(wordCount('example.com'), 2);
});

test('counts letters and digits in non-Latin scripts', () => {
  assert.equal(wordCount('привет мир'), 2);
  assert.equal(wordCount('你好 世界'), 2);
  assert.equal(wordCount('٣٤'), 1);
});

test('returns 0 for a long string with no letters or digits', () => {
  assert.equal(wordCount('!?.,;:-—–/_\'’ '.repeat(100)), 0);
});
