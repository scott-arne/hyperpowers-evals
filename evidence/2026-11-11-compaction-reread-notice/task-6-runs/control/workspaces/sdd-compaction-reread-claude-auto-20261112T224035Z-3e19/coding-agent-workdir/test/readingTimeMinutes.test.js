const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// The same passage as test/wordCount.test.js; wc -w gives 64 words.
const PASSAGE = [
  'The lighthouse keeper climbed the spiral stairs every evening, counting',
  'each step as his father had taught him. There were one hundred and twelve,',
  'and on stormy nights the number never seemed to change, though his legs',
  'insisted otherwise. At the top he trimmed the wick, polished the great lens,',
  'and watched the beam sweep across the water toward ships he would never meet.',
].join('\n');

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

test('throws a RangeError naming the function for an invalid wpm', () => {
  const bad = [0, -0, -1, -200, NaN, Infinity, -Infinity, '200', '', null, true, {}, [], [200], 200n];
  for (const wpm of bad) {
    assert.throws(() => readingTimeMinutes('a b c', wpm), (err) => {
      assert.ok(err instanceof RangeError, String(wpm));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(wpm));
      return true;
    });
  }
});

test('rejects an invalid wpm even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('defaults wpm to 200 when omitted or undefined', () => {
  assert.equal(readingTimeMinutes(words(200)), 1);
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('accepts a fractional wpm and rounds up', () => {
  // 301 / 150.5 = 2 exactly; 302 / 150.5 is just over 2, so it rounds up to 3.
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
  // 1 / 0.5 = 2.
  assert.equal(readingTimeMinutes('hello', 0.5), 2);
});

test('checks the text before the rate', () => {
  for (const wpm of [0, -1, NaN, '200', null]) {
    assert.throws(() => readingTimeMinutes(42, wpm), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts words the way wordCount does', () => {
  // Hyphenated compound and contractions: 1 word each.
  assert.equal(readingTimeMinutes('well-known don\'t keeper’s', 1), 3);
  // Decimals and domains split at the point: 3.14 is 2 words, example.com is 2.
  assert.equal(readingTimeMinutes('3.14', 1), 2);
  assert.equal(readingTimeMinutes('example.com', 1), 2);
  // Dashes and slashes separate: one, two, and, or = 4 words.
  assert.equal(readingTimeMinutes('one—two and/or', 1), 4);
});

test('rounds three paragraphs of 270 words up to 2 minutes', () => {
  // Nine words per sentence, ten sentences per paragraph, three paragraphs.
  const sentence = 'The quick brown fox jumps over the lazy dog.';
  const paragraph = Array.from({ length: 10 }, () => sentence).join(' ');
  const text = [paragraph, paragraph, paragraph].join('\n\n');
  assert.equal(readingTimeMinutes(text), 2); // ceil(270 / 200) = ceil(1.35)
  assert.equal(readingTimeMinutes(text, 270), 1);
  assert.equal(readingTimeMinutes(text, 269), 2);
});

test('rounds the 64-word passage up to 1 minute, or 7 at 10 wpm', () => {
  assert.equal(readingTimeMinutes(PASSAGE), 1); // ceil(64 / 200)
  assert.equal(readingTimeMinutes(PASSAGE, 10), 7); // ceil(6.4)
  assert.equal(readingTimeMinutes(PASSAGE, 64), 1);
  assert.equal(readingTimeMinutes(PASSAGE, 63), 2);
});
