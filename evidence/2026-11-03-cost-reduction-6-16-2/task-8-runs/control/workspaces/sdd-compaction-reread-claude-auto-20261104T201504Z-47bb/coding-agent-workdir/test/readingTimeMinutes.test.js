const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wordCount, readingTimeMinutes } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// Ten copies of a nine-word sentence per paragraph, three paragraphs separated
// by blank lines: 3 * 10 * 9 = 270 words.
const SENTENCE = 'The quick brown fox jumps over the lazy dog.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const PASSAGE = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

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

test('counts a three-paragraph passage of 270 words', () => {
  assert.equal(wordCount(PASSAGE), 270);
});

test('rounds the 270-word passage up to two minutes at the default rate', () => {
  assert.equal(readingTimeMinutes(PASSAGE), 2);
});

test('applies an explicit rate to the 270-word passage', () => {
  assert.equal(readingTimeMinutes(PASSAGE, 100), 3);
  assert.equal(readingTimeMinutes(PASSAGE, 269), 2);
  assert.equal(readingTimeMinutes(PASSAGE, 270), 1);
});

test('uses a default rate of 200 words per minute', () => {
  assert.equal(readingTimeMinutes(words(200)), readingTimeMinutes(words(200), 200));
  assert.equal(readingTimeMinutes(words(201)), readingTimeMinutes(words(201), 200));
  assert.equal(readingTimeMinutes(words(201), 201), 1);
});

test('uses the default rate when wpm is undefined', () => {
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('accepts a fractional rate', () => {
  assert.equal(readingTimeMinutes('a b c', 1.5), 2);
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('throws a RangeError naming the function for an invalid rate', () => {
  for (const bad of [0, -1, -200, NaN, Infinity, -Infinity, '200', null]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(5, 0), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('counts hyphenated compounds, contractions and decimals as wordCount does', () => {
  // well-known (1) + don't (1) + 3.14 (2: "3" and "14") = 4 words.
  const text = "well-known don't 3.14";
  assert.equal(wordCount(text), 4);
  assert.equal(readingTimeMinutes(text, 1), 4);
  assert.equal(readingTimeMinutes(text, 2), 2);
  assert.equal(readingTimeMinutes(text, 3), 2);
  assert.equal(readingTimeMinutes(text, 4), 1);
});
