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
  // 64, as reported by `wc -w` on the passage text.
  assert.equal(wordCount(PASSAGE), 64);
});

test('joins words with a single apostrophe or hyphen between letters or digits', () => {
  const rows = [
    ["don't", 1],
    ['keeper’s', 1],
    ['well-known', 1],
    ['1-2', 1],
    ["it's a well-known keeper’s dog", 5],
  ];
  for (const [text, expected] of rows) {
    assert.equal(wordCount(text), expected, JSON.stringify(text));
  }
});

test('drops a stray joiner that lacks a letter or digit on both sides', () => {
  const rows = [
    ['well-', 1],
    ["dogs'", 1],
    ['-well', 1],
    ["'dogs", 1],
    ['dogs’ bowls', 2],
    ['well- known', 2],
    ["a--b", 2],
    ["a''b", 2],
  ];
  for (const [text, expected] of rows) {
    assert.equal(wordCount(text), expected, JSON.stringify(text));
  }
});

test('separates words at dashes, slashes, underscores and points', () => {
  const rows = [
    ['one—two', 2],
    ['one–two', 2],
    ['and/or', 2],
    ['snake_case', 2],
    ['3.14', 2],
    ['example.com', 2],
  ];
  for (const [text, expected] of rows) {
    assert.equal(wordCount(text), expected, JSON.stringify(text));
  }
});

test('counts letters and digits in non-Latin scripts', () => {
  const rows = [
    ['Привет мир', 2],
    ['日本語', 1],
    ['café naïve', 2],
    ['٣٤ १२', 2],
  ];
  for (const [text, expected] of rows) {
    assert.equal(wordCount(text), expected, JSON.stringify(text));
  }
});

test('returns 0 for a string of only punctuation', () => {
  assert.equal(wordCount('... — -- \'\' ’ / _ !?'), 0);
});
