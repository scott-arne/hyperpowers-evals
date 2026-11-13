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

// D1: Test PASSAGE constant has word count of 64
test('counts 64 words in the PASSAGE constant', () => {
  assert.equal(wordCount(PASSAGE), 64);
});

// D2: Tests for Behaviour rules not covered by brief's tests

// Rule 2: apostrophe joiners inside words
test('treats straight apostrophe as word joiner when surrounded by letters', () => {
  assert.equal(wordCount("don't"), 1);
});

test('treats typographic apostrophe as word joiner when surrounded by letters', () => {
  assert.equal(wordCount("keeper’s"), 1);
});

test('treats apostrophe as word joiner with digits on both sides', () => {
  assert.equal(wordCount("'90s"), 1);
});

// Rule 2: hyphen joiners inside words
test('treats hyphen as word joiner when surrounded by letters', () => {
  assert.equal(wordCount('well-known'), 1);
});

test('treats hyphen as word joiner when surrounded by digits', () => {
  assert.equal(wordCount('1-2'), 1);
});

test('treats hyphen as word joiner with mixed letters and digits', () => {
  assert.equal(wordCount('x-1'), 1);
});

// Rule 2: stray/leading/trailing joiners dropped
test('drops trailing apostrophe without following letter/digit', () => {
  assert.equal(wordCount("dogs'"), 1);
});

test('drops trailing hyphen without following letter/digit', () => {
  assert.equal(wordCount('well-'), 1);
});

test('drops leading apostrophe without preceding letter/digit', () => {
  assert.equal(wordCount("'hello"), 1);
});

test('drops leading hyphen without preceding letter/digit', () => {
  assert.equal(wordCount('-hello'), 1);
});

// Rule 2: multiple joiners don't join across the middle
test('treats multiple consecutive joiners as separators', () => {
  assert.equal(wordCount("well--known"), 2);
});

test('chains apostrophe and hyphen joiners in a single word', () => {
  assert.equal(wordCount("don't-know"), 1);
});

// Rule 3: periods in decimals split into separate words
test('treats period in decimal number as word separator', () => {
  assert.equal(wordCount('3.14'), 2);
});

// Rule 3: periods in domain names split into separate words
test('treats period in domain name as word separator', () => {
  assert.equal(wordCount('example.com'), 2);
});

// Rule 3: em dashes separate words
test('treats em dash as word separator', () => {
  assert.equal(wordCount('hello—world'), 2);
});

// Rule 3: en dashes separate words
test('treats en dash as word separator', () => {
  assert.equal(wordCount('hello–world'), 2);
});

// Rule 3: slashes separate words
test('treats forward slash as word separator', () => {
  assert.equal(wordCount('and/or'), 2);
});

// Rule 3: underscores are not word characters
test('treats underscore as word separator', () => {
  assert.equal(wordCount('snake_case'), 2);
});

// Rule 3: other sentence punctuation separates words
test('treats exclamation mark as word separator', () => {
  assert.equal(wordCount('hello!world'), 2);
});

test('treats question mark as word separator', () => {
  assert.equal(wordCount('hello?world'), 2);
});

test('treats comma as word separator', () => {
  assert.equal(wordCount('hello,world'), 2);
});

test('treats semicolon as word separator', () => {
  assert.equal(wordCount('hello;world'), 2);
});

test('treats colon as word separator', () => {
  assert.equal(wordCount('hello:world'), 2);
});

// Rule 4: Unicode letters and digits in any script
test('counts words with Unicode letters from different scripts', () => {
  assert.equal(wordCount('café naïve'), 2);
});

test('counts words with digits from different scripts', () => {
  assert.equal(wordCount('hello123'), 1);
});

// Rule 5: no letters or digits = zero words (already covered, but test edge case)
test('returns 0 for string with only punctuation', () => {
  assert.equal(wordCount('!!!???---'), 0);
});

test('returns 0 for string with only underscores', () => {
  assert.equal(wordCount('___'), 0);
});
