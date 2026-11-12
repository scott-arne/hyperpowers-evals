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

test('counts the words in the lighthouse passage', () => {
  assert.equal(wordCount(PASSAGE), 64);
});

test('counts apostrophe and hyphen compounds as one word each', () => {
  assert.equal(wordCount("don't keeper’s well-known"), 3);
});

test('drops a stray trailing apostrophe or hyphen from a word', () => {
  assert.equal(wordCount("well- dogs'"), 2);
});

test('splits decimal numbers and domain names at the point', () => {
  assert.equal(wordCount('3.14'), 2);
  assert.equal(wordCount('example.com'), 2);
});

test('separates words at em dashes, en dashes, slashes and underscores', () => {
  assert.equal(wordCount('one—two–three/four_five'), 5);
});

test('counts runs of letters and digits in any script as words', () => {
  assert.equal(wordCount('café naïve 日本語 42'), 4);
});

test('returns 0 for a long string with no letters or digits', () => {
  assert.equal(wordCount('... -- ?! — \' ’ - _'.repeat(50)), 0);
});
