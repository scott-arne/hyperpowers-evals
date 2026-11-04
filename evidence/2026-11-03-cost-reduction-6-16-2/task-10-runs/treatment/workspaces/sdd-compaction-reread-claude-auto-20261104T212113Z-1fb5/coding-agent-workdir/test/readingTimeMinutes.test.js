const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// 64 words by wordCount, so it reads in one minute at the default rate.
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

test('throws a RangeError naming the function for each invalid rate', () => {
  for (const bad of [0, -1, NaN, Infinity, -Infinity, '200', null]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError, `wpm ${String(bad)}`);
      assert.ok(err.message.startsWith('readingTimeMinutes:'), `wpm ${String(bad)}`);
      return true;
    });
  }
});

test('accepts a fractional rate', () => {
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('uses the default rate when the rate is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(42, 0), TypeError);
  assert.throws(() => readingTimeMinutes(null, NaN), TypeError);
});

test('counts hyphenated compounds, contractions and decimals like wordCount', () => {
  const text = "A well-known cat doesn't weigh 3.14 kilos.";
  assert.equal(readingTimeMinutes(text, 1), Math.ceil(wordCount(text) / 1));
  assert.equal(readingTimeMinutes(text, 1), wordCount(text));
});

test('rounds a multi-line passage up to whole minutes at several rates', () => {
  assert.equal(readingTimeMinutes(PASSAGE), 1);
  assert.equal(readingTimeMinutes(PASSAGE, 32), 2);
  assert.equal(readingTimeMinutes(PASSAGE, 63), 2);
  assert.equal(readingTimeMinutes(PASSAGE, 64), 1);
});
