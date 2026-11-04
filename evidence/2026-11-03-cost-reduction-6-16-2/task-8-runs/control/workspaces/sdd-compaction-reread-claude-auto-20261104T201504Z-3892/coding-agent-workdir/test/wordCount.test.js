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

test('counts the words of the lighthouse passage', () => {
  assert.equal(wordCount(PASSAGE), 64);
});

test('joins a straight apostrophe between letters into one word', () => {
  assert.equal(wordCount("don't"), 1);
  assert.equal(wordCount("don't stop"), 2);
});

test('joins a typographic apostrophe between letters into one word', () => {
  assert.equal(wordCount('keeper’s'), 1);
  assert.equal(wordCount('the keeper’s lamp'), 3);
});

test('joins a hyphen between letters into one word', () => {
  assert.equal(wordCount('well-known'), 1);
  assert.equal(wordCount('a well-known fact'), 3);
});

test('drops a stray trailing hyphen from a word', () => {
  assert.equal(wordCount('well-'), 1);
  assert.equal(wordCount('well- known'), 2);
});

test('drops a stray trailing apostrophe from a word', () => {
  assert.equal(wordCount("dogs'"), 1);
  assert.equal(wordCount("the dogs' bowls"), 3);
});

test('separates words at em dashes and en dashes', () => {
  assert.equal(wordCount('wait—what'), 2);
  assert.equal(wordCount('2019–2020'), 2);
});

test('separates words at slashes', () => {
  assert.equal(wordCount('and/or'), 2);
  assert.equal(wordCount('a/b/c'), 3);
});

test('separates words at underscores', () => {
  assert.equal(wordCount('snake_case'), 2);
});

test('counts a decimal number as two words', () => {
  assert.equal(wordCount('3.14'), 2);
});

test('counts a domain name as two words', () => {
  assert.equal(wordCount('example.com'), 2);
});

test('counts words in non-Latin scripts', () => {
  assert.equal(wordCount('naïve café'), 2);
  assert.equal(wordCount('Привет мир'), 2);
  assert.equal(wordCount('日本語'), 1);
});

test('counts runs of digits as words, including non-ASCII digits', () => {
  assert.equal(wordCount('42 7'), 2);
  assert.equal(wordCount('١٢٣'), 1);
});

test('returns 0 for a long string with no letters or digits', () => {
  assert.equal(wordCount('!?.,;:-—–/_\'’ '.repeat(100)), 0);
});
