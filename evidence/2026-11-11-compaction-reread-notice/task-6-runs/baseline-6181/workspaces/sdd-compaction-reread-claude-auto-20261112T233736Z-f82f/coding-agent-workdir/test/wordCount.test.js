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

test('counts the words of the reference passage', () => {
  assert.equal(wordCount(PASSAGE), 64);
});

test('keeps a straight apostrophe inside a word', () => {
  assert.equal(wordCount("don't"), 1);
});

test('keeps a typographic apostrophe inside a word', () => {
  assert.equal(wordCount('keeper\u2019s'), 1);
});

test('keeps a single hyphen inside a word', () => {
  assert.equal(wordCount('well-known'), 1);
});

test('drops a trailing hyphen or apostrophe instead of joining', () => {
  assert.equal(wordCount('well-'), 1);
  assert.equal(wordCount("dogs'"), 1);
  assert.equal(wordCount('well- known'), 2);
  assert.equal(wordCount("the dogs' bowls"), 3);
});

test('does not join across a leading or doubled joiner', () => {
  assert.equal(wordCount('-well'), 1);
  assert.equal(wordCount('well--known'), 2);
});

test('splits the point in a decimal number into two words', () => {
  assert.equal(wordCount('3.14'), 2);
});

test('splits a domain name at its point', () => {
  assert.equal(wordCount('example.com'), 2);
});

test('treats dashes, slashes and underscores as separators', () => {
  assert.equal(wordCount('one\u2014two'), 2);
  assert.equal(wordCount('one\u2013two'), 2);
  assert.equal(wordCount('one/two'), 2);
  assert.equal(wordCount('one_two'), 2);
});

test('counts words in non-Latin scripts', () => {
  assert.equal(wordCount('\u043F\u0440\u0438\u0432\u0435\u0442 \u043C\u0438\u0440'), 2);
  assert.equal(wordCount('\u4F60\u597D \u4E16\u754C'), 2);
});

test('returns 0 for a string with no letters or digits', () => {
  assert.equal(wordCount('... --- !!! \u2014 \' _ /'), 0);
});
