const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wordCount } = require('../src/textstats');

// A passage with no standalone punctuation and no hyphenated or apostrophe
// words, so whitespace-separated tokens and words coincide. Its 64 words were
// counted under the word rule (letter/digit runs), line by line: 10, 14, 13,
// 13, 14. `wc -w` agrees here.
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
  assert.equal(wordCount(PASSAGE), 64);
});

test('joins words with a single straight apostrophe', () => {
  assert.equal(wordCount("don't"), 1);
});

test('joins words with a single typographic apostrophe', () => {
  assert.equal(wordCount('keeper\u2019s'), 1);
});

test('joins words with a single hyphen', () => {
  assert.equal(wordCount('well-known'), 1);
});

test('joins several runs chained by joiners into one word', () => {
  assert.equal(wordCount("mother-in-law's"), 1);
});

test('joins digits to letters across a joiner', () => {
  assert.equal(wordCount('3-d'), 1);
  assert.equal(wordCount("rock'n'roll"), 1);
});

test('drops a trailing hyphen from the word it follows', () => {
  assert.equal(wordCount('well-'), 1);
  assert.equal(wordCount('well- known'), 2);
});

test('drops a trailing apostrophe from the word it follows', () => {
  assert.equal(wordCount("dogs'"), 1);
  assert.equal(wordCount("the dogs' bowls"), 3);
});

test('drops a leading joiner', () => {
  assert.equal(wordCount("-well 'tis"), 2);
});

test('does not join across a doubled joiner', () => {
  assert.equal(wordCount('a--b'), 2);
  assert.equal(wordCount("a''b"), 2);
});

test('does not join across a joiner next to whitespace', () => {
  assert.equal(wordCount('well - known'), 2);
});

test('splits words on an em dash', () => {
  assert.equal(wordCount('wait\u2014what'), 2);
});

test('splits words on an en dash', () => {
  assert.equal(wordCount('pages 10\u201320'), 3);
});

test('splits words on sentence punctuation', () => {
  assert.equal(wordCount('Hello, world! Is it? Yes; no: maybe.'), 7);
});

test('splits words on slashes', () => {
  assert.equal(wordCount('and/or'), 2);
});

test('splits words on underscores', () => {
  assert.equal(wordCount('snake_case_name'), 3);
});

test('counts the point in a decimal number as a separator', () => {
  assert.equal(wordCount('3.14'), 2);
});

test('counts the point in a domain name as a separator', () => {
  assert.equal(wordCount('example.com'), 2);
});

test('counts digits as words', () => {
  assert.equal(wordCount('42'), 1);
  assert.equal(wordCount('room 101 floor 2'), 4);
});

test('counts words in non-Latin scripts', () => {
  assert.equal(wordCount('\u043f\u0440\u0438\u0432\u0435\u0442 \u043c\u0438\u0440'), 2);
  assert.equal(wordCount('\u03ba\u03cc\u03c3\u03bc\u03bf\u03c2'), 1);
  assert.equal(wordCount('\u3053\u3093\u306b\u3061\u306f \u4e16\u754c'), 2);
});

test('counts accented letters as part of a word', () => {
  assert.equal(wordCount('caf\u00e9 na\u00efve'), 2);
});

test('returns 0 for a long string with no letters or digits', () => {
  assert.equal(wordCount('-'.repeat(500)), 0);
  assert.equal(wordCount("!?.,;:'\u2019-\u2014\u2013/_ ".repeat(50)), 0);
});
