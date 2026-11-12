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

// Added tests: rules stated in the task prose that the tests above omit.

test('counts the reference passage as 64 words, as wc -w does', () => {
  assert.equal(wordCount(PASSAGE), 64);
});

test('counts a straight apostrophe between letters as one word', () => {
  assert.equal(wordCount("don't"), 1);
});

test('counts a typographic apostrophe between letters as one word', () => {
  assert.equal(wordCount('keeper’s'), 1);
});

test('counts a hyphenated compound as one word', () => {
  assert.equal(wordCount('well-known'), 1);
});

test('drops a trailing hyphen from the word before it', () => {
  assert.equal(wordCount('well-'), 1);
  assert.equal(wordCount('well- known'), 2);
});

test('drops a trailing apostrophe from the word before it', () => {
  assert.equal(wordCount("dogs'"), 1);
  assert.equal(wordCount("the dogs' bowls"), 3);
});

test('drops a leading joiner that has no letter before it', () => {
  assert.equal(wordCount("-well 'tis"), 2);
});

test('treats a doubled joiner as a separator', () => {
  assert.equal(wordCount("don''t"), 2);
  assert.equal(wordCount('well--known'), 2);
});

test('counts digits as word characters', () => {
  assert.equal(wordCount('route 66'), 2);
  assert.equal(wordCount('2-3'), 1);
});

test('splits the point in a decimal number into two words', () => {
  assert.equal(wordCount('3.14'), 2);
});

test('splits a domain name at its point into two words', () => {
  assert.equal(wordCount('example.com'), 2);
});

test('treats em and en dashes as separators', () => {
  assert.equal(wordCount('one—two'), 2);
  assert.equal(wordCount('one–two'), 2);
});

test('treats slashes and underscores as separators', () => {
  assert.equal(wordCount('and/or'), 2);
  assert.equal(wordCount('snake_case_name'), 3);
});

test('treats sentence punctuation as a separator', () => {
  assert.equal(wordCount('Hello,world!How?Fine;ok:yes'), 6);
});

test('returns 0 for a long string with no letters or digits', () => {
  assert.equal(wordCount('-- ... !!! ??? — _ / \' ’ -'.repeat(50)), 0);
});

test('counts words in any script', () => {
  assert.equal(wordCount('café привет Ελλάδα 東京'), 4);
});

test('keeps combining marks inside a word (Devanagari)', () => {
  assert.equal(wordCount('नमस्ते दुनिया'), 2);
});

test('keeps a decomposed accent inside a word', () => {
  assert.equal(wordCount('nai\u0308ve cafe\u0301 au lait'), 4);
});

test('keeps combining marks after a joiner inside a word', () => {
  assert.equal(wordCount('re\u0301sume\u0301-style'), 1);
  assert.equal(wordCount('r\u00e9sum\u00e9-style'), 1);
});

test('a run of only combining marks is not a word', () => {
  assert.equal(wordCount('I ❤️ NY'), 2); // heart + variation selector
  assert.equal(wordCount('️'), 0); // lone variation selector
  assert.equal(wordCount('́'), 0); // lone combining acute
  assert.equal(wordCount('1️⃣'), 1); // keycap: digit start keeps its marks
  assert.equal(wordCount('⃣'), 0); // lone keycap mark
});
