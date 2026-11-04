const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// Three paragraphs of ten copies of a nine-word sentence: 270 words.
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

test('returns 2 for a 270-word multi-paragraph text', () => {
  assert.equal(wordCount(PASSAGE), 270);
  assert.ok(PASSAGE.split('\n\n').length === 3);
  assert.equal(readingTimeMinutes(PASSAGE), 2);
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

test('uses 200 words per minute when wpm is omitted or undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes(words(400), undefined), readingTimeMinutes(words(400), 200));
});

test('uses a custom wpm to scale the result', () => {
  assert.equal(readingTimeMinutes(words(300), 100), 3);
  assert.equal(readingTimeMinutes(words(301), 100), 4);
  assert.equal(readingTimeMinutes(words(300), 300), 1);
});

test('accepts a fractional wpm and rounds the quotient up', () => {
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
  assert.equal(readingTimeMinutes(words(10), 0.5), 20);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('throws a RangeError naming the function for an invalid wpm', () => {
  const bad = [0, -0, -1, -200, NaN, Infinity, -Infinity, '200', '1', null, true, {}, [200]];
  for (const wpm of bad) {
    assert.throws(() => readingTimeMinutes('hello world', wpm), (err) => {
      assert.ok(err instanceof RangeError, `wpm ${String(wpm)}`);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('validates wpm even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(12, 0), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
  assert.throws(() => readingTimeMinutes(undefined, NaN), TypeError);
});

test('counts hyphenated compounds, contractions and decimals as wordCount does', () => {
  const text = 'well-known don’t 3.14 ' + words(197);
  // well-known (1), don’t (1), 3.14 (2: "3" and "14") plus 197 words.
  assert.equal(wordCount(text), 201);
  assert.equal(readingTimeMinutes(text), 2);
  const compact = 'well-known don\'t ' + words(198);
  assert.equal(wordCount(compact), 200);
  assert.equal(readingTimeMinutes(compact), 1);
});
