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

// Nine words: The, cat, sat, on, the, mat, and, then, slept.
const SENTENCE = 'The cat sat on the mat and then slept.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const MULTI_PARAGRAPH = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

test('rounds a 270-word, three-paragraph text up to two minutes at the default rate', () => {
  // 3 paragraphs x 10 sentences x 9 words = 270 words.
  assert.equal(wordCount(MULTI_PARAGRAPH), 270);
  assert.equal(readingTimeMinutes(MULTI_PARAGRAPH), 2);
});

test('throws a RangeError naming the function for an invalid wpm', () => {
  const bads = [0, -0, -1, -200, NaN, Infinity, -Infinity, '200', '1', null];
  for (const bad of bads) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, `class for ${String(bad)}`);
      assert.ok(err.message.startsWith('readingTimeMinutes:'), `prefix for ${String(bad)}`);
      return true;
    }, String(bad));
  }
});

test('accepts a fractional wpm and rounds up against it', () => {
  // 301 / 150.5 = 2 exactly; 302 / 150.5 = 2.0066..., which rounds up to 3.
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('treats an explicit undefined wpm as the default of 200', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(123, -1), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('counts hyphenated compounds, contractions and decimals the way wordCount does', () => {
  // "well-known" = 1, "don't" = 1, "3.14" = 2 ("3" and "14"); 4 words in all.
  const text = 'well-known don\'t 3.14';
  assert.equal(wordCount(text), 4);
  assert.equal(readingTimeMinutes(text, 1), 4);
});
