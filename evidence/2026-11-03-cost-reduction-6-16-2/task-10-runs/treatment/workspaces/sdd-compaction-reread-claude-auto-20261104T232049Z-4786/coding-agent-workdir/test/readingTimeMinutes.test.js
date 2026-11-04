const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

const CASES = [
  ["", null, 0],
  ["x", null, 1],
  ["x x", null, 1],
  ["", 50, 0],
  ["x", 1, 1],
  ["x x", 1, 2],
  ["x x x", 1, 3],
  ["x x x", 2, 2],
];

test('returns 0 for the empty string', () => {
  assert.equal(readingTimeMinutes(''), 0);
});

test('returns 0 for whitespace and punctuation only', () => {
  assert.equal(readingTimeMinutes(' \n -- ... '), 0);
});

test('rounds a single word up to one minute', () => {
  assert.equal(readingTimeMinutes('hello'), 1);
});

test('returns 1 for exactly 200 words at the default rate', () => {
  assert.equal(readingTimeMinutes(words(200)), 1);
});

test('returns 2 for 201 words at the default rate', () => {
  assert.equal(readingTimeMinutes(words(201)), 2);
});

test('returns 2 for exactly 400 words at the default rate', () => {
  assert.equal(readingTimeMinutes(words(400)), 2);
});

test('throws a TypeError naming the function for a non-string', () => {
  for (const bad of [undefined, null, 12, {}, ['a b']]) {
    assert.throws(() => readingTimeMinutes(bad), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('matches every row of the reference table', () => {
  for (const [text, wpm, expected] of CASES) {
    const actual = wpm === null ? readingTimeMinutes(text) : readingTimeMinutes(text, wpm);
    assert.equal(actual, expected, JSON.stringify([text, wpm]));
  }
});

// Brief defines no PASSAGE constant; this one is built for the tokenizer rules.
// Hand-counted words: Well-known (1) authors (2) don't (3) rush (4) 3 (5)
// 14 (6) pages (7) of (8) prose (9) em (10) dash (11). The period inside 3.14
// and the em dash both separate words, so the total is 11.
const PASSAGE = "Well-known authors don't rush 3.14 pages of prose—em dash.";

test('counts hyphenated compounds, contractions, decimals and em dashes in a passage', () => {
  // 11 words: at 5 wpm ceil(2.2) = 3; at 10 wpm ceil(1.1) = 2; at 11 wpm 11 / 11 = 1; at 200 wpm ceil(0.055) = 1.
  assert.equal(readingTimeMinutes(PASSAGE, 5), 3);
  assert.equal(readingTimeMinutes(PASSAGE, 10), 2);
  assert.equal(readingTimeMinutes(PASSAGE, 11), 1);
  assert.equal(readingTimeMinutes(PASSAGE), 1);
});

test('returns 2 for a 270-word text spread over three paragraphs', () => {
  const sentence = 'The quick brown fox jumps over the lazy dog.'; // 9 words
  const paragraph = Array.from({ length: 10 }, () => sentence).join(' '); // 90 words
  const text = [paragraph, paragraph, paragraph].join('\n\n'); // 270 words
  // ceil(270 / 200) = ceil(1.35) = 2; ceil(270 / 270) = 1 confirms the count is exactly 270.
  assert.equal(readingTimeMinutes(text), 2);
  assert.equal(readingTimeMinutes(text, 270), 1);
  assert.equal(readingTimeMinutes(text, 269), 2);
});

test('uses the default rate of 200 when wpm is undefined', () => {
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
});

test('accepts a fractional wpm', () => {
  // 3 words at 1.5 wpm: 3 / 1.5 = 2. At 150.5 wpm: 301 words is exactly 2, 300 is ceil(1.993) = 2, 302 is ceil(2.007) = 3.
  assert.equal(readingTimeMinutes('x x x', 1.5), 2);
  assert.equal(readingTimeMinutes(words(300), 150.5), 2);
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('throws a RangeError naming the function for an out-of-range wpm', () => {
  const bad = [0, -0, -1, -200, NaN, Infinity, -Infinity, '200', '', null, true, {}, [200], 10n];
  for (const wpm of bad) {
    assert.throws(() => readingTimeMinutes('a b c', wpm), (err) => {
      assert.ok(err instanceof RangeError, `wpm ${String(wpm)}`);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('throws a RangeError for a bad wpm even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(12, 0), TypeError);
  assert.throws(() => readingTimeMinutes(null, NaN), TypeError);
});

test('counts hyphenated compounds, contractions and decimals like wordCount', () => {
  // At 1 wpm the result equals the word count.
  assert.equal(readingTimeMinutes('well-known', 1), 1);
  assert.equal(readingTimeMinutes("don't ’tis can’t", 1), 3); // don't, tis (leading joiner dropped), can’t
  assert.equal(readingTimeMinutes('3.14', 1), 2);
});
