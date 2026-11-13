const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

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

function assertThrowsWithPrefix(fn, ErrorClass) {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof ErrorClass);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
}

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

test('returns 2 for three paragraphs of ten nine-word sentences', () => {
  const sentence = 'The quick brown fox jumps over the lazy dog.';
  const paragraph = Array.from({ length: 10 }, () => sentence).join(' ');
  const text = [paragraph, paragraph, paragraph].join('\n\n');
  assert.equal(wordCount(text), 270);
  assert.equal(readingTimeMinutes(text), 2);
});

test('throws a TypeError naming the function for a non-string', () => {
  for (const bad of [undefined, null, 12, {}, ['a b']]) {
    assertThrowsWithPrefix(() => readingTimeMinutes(bad), TypeError);
  }
});

test('matches every row of the reference table', () => {
  for (const [text, wpm, expected] of CASES) {
    const actual = wpm === null ? readingTimeMinutes(text) : readingTimeMinutes(text, wpm);
    assert.equal(actual, expected, JSON.stringify([text, wpm]));
  }
});

test('uses the default rate when wpm is undefined', () => {
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
});

test('accepts a fractional rate', () => {
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
});

test('throws a RangeError naming the function for zero and negative rates', () => {
  for (const bad of [0, -0, -1, -200.5]) {
    assertThrowsWithPrefix(() => readingTimeMinutes('a b c', bad), RangeError);
  }
});

test('throws a RangeError naming the function for NaN and the infinities', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assertThrowsWithPrefix(() => readingTimeMinutes('a b c', bad), RangeError);
  }
});

test('throws a RangeError naming the function for a rate that is not a number', () => {
  for (const bad of ['200', '', null, true, {}, [200], 10n]) {
    assertThrowsWithPrefix(() => readingTimeMinutes('a b c', bad), RangeError);
  }
});

test('throws a RangeError for a bad rate even when the text is empty', () => {
  assertThrowsWithPrefix(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  assertThrowsWithPrefix(() => readingTimeMinutes(42, 0), TypeError);
  assertThrowsWithPrefix(() => readingTimeMinutes(undefined, 'fast'), TypeError);
});

test('counts hyphenated compounds, contractions and decimals as wordCount does', () => {
  const text = `${words(196)} well-known don't 3.14 x`;
  // well-known, don't and x are one word each; 3.14 is two.
  assert.equal(wordCount(text), 196 + 1 + 1 + 2 + 1);
  assert.equal(readingTimeMinutes(text), Math.ceil(wordCount(text) / 200));
  assert.equal(readingTimeMinutes(text), 2);
  assert.equal(readingTimeMinutes(`${words(196)} well-known don't 3.14`), 1);
});

test('agrees with wordCount for the passage fixture', () => {
  assert.equal(readingTimeMinutes(PASSAGE), Math.ceil(wordCount(PASSAGE) / 200));
  assert.equal(readingTimeMinutes(PASSAGE), 1);
  assert.equal(readingTimeMinutes(PASSAGE, 20), Math.ceil(wordCount(PASSAGE) / 20));
});

test('returns equal values when called twice with the same arguments', () => {
  assert.equal(readingTimeMinutes(PASSAGE, 30), readingTimeMinutes(PASSAGE, 30));
});
