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

// Added per the human partner's decision: cover every Behaviour bullet.

test('counts the words in the passage, matching wc -w', () => {
  // 64 was established with `wc -w` on the passage text (5 lines, no joiners
  // or standalone punctuation), and confirmed by hand: 10 + 14 + 13 + 13 + 14.
  assert.equal(wordCount(PASSAGE), 64);
});

test('joins words with a straight apostrophe', () => {
  assert.equal(wordCount("don't"), 1);
  assert.equal(wordCount("it's a dog's life"), 4);
});

test('joins words with a typographic apostrophe', () => {
  assert.equal(wordCount('keeper’s'), 1);
  assert.equal(wordCount('it’s a dog’s life'), 4);
});

test('joins words with a single hyphen', () => {
  assert.equal(wordCount('well-known'), 1);
  assert.equal(wordCount('a well-known, up-to-date list'), 4);
});

test('drops a stray trailing hyphen', () => {
  assert.equal(wordCount('well-'), 1);
  assert.equal(wordCount('well- known'), 2);
});

test('drops a stray trailing apostrophe', () => {
  assert.equal(wordCount("dogs'"), 1);
  assert.equal(wordCount("dogs' bones"), 2);
  assert.equal(wordCount('dogs’ bones'), 2);
});

test('does not join across a leading joiner or a doubled joiner', () => {
  assert.equal(wordCount('-well'), 1);
  assert.equal(wordCount("'tis"), 1);
  assert.equal(wordCount('a--b'), 2);
  assert.equal(wordCount("don''t"), 2);
});

test('treats em and en dashes as separators', () => {
  assert.equal(wordCount('one—two'), 2);
  assert.equal(wordCount('pages 1–2'), 3);
});

test('treats slashes as separators', () => {
  assert.equal(wordCount('and/or'), 2);
  assert.equal(wordCount('a/b/c'), 3);
  assert.equal(wordCount('a\\b'), 2);
});

test('treats underscores as separators', () => {
  assert.equal(wordCount('snake_case_name'), 3);
});

test('splits a decimal number at the point', () => {
  assert.equal(wordCount('3.14'), 2);
});

test('splits a domain name at the points', () => {
  assert.equal(wordCount('example.com'), 2);
  assert.equal(wordCount('www.example.com'), 3);
});

test('counts words in non-Latin scripts', () => {
  assert.equal(wordCount('café naïve'), 2);
  assert.equal(wordCount('привет мир'), 2);
  assert.equal(wordCount('日本語 テスト'), 2);
});

test('counts digits, including non-ASCII digits, as word characters', () => {
  assert.equal(wordCount('abc123'), 1);
  assert.equal(wordCount('2024 ٣٤'), 2);
});

test('returns 0 for a string of only punctuation', () => {
  assert.equal(wordCount("!?.,;:—–-'’_/ \"()"), 0);
  assert.equal(wordCount('...'.repeat(1000)), 0);
});
