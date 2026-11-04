const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

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

// Additions beyond the plan's eight tests.

// Nine words; ten copies make a paragraph, three paragraphs make 270 words.
const SENTENCE = 'The quick brown fox jumps over the lazy dog.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const MULTI_PARAGRAPH = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

test('counts the words of a three-paragraph text and rounds 270 words up to 2 minutes', () => {
  assert.equal(wordCount(SENTENCE), 9);
  assert.equal(wordCount(MULTI_PARAGRAPH), 270);
  assert.equal(readingTimeMinutes(MULTI_PARAGRAPH), 2);
});

test('throws a RangeError naming the function for a wpm that is not a positive finite number', () => {
  for (const bad of [0, -1, -0.5, NaN, Infinity, -Infinity, '200', null]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('accepts a fractional wpm and rounds up against it', () => {
  // 301 / 150.5 is exactly 2; 302 / 150.5 is just over 2.
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('falls back to 200 words per minute when wpm is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('checks the text before the rate', () => {
  for (const badWpm of [0, NaN, '200', null]) {
    assert.throws(() => readingTimeMinutes(12, badWpm), (err) => {
      assert.ok(err instanceof TypeError, String(badWpm));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(badWpm));
      return true;
    });
  }
});

test('counts hyphenated compounds, contractions and decimals the way wordCount does', () => {
  // At one word per minute the result is the word count itself.
  const cases = [
    ['state-of-the-art', 1],
    ["don't can’t", 2],
    ['3.14 2.5', 4],
    ["A well-known dog doesn't bark at 3.14 cats today", 10],
  ];
  for (const [text, expected] of cases) {
    assert.equal(wordCount(text), expected, text);
    assert.equal(readingTimeMinutes(text, 1), expected, text);
  }
});
