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

test('uses the default rate of 200 when wpm is passed as undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('accepts a fractional wpm and rounds up against it', () => {
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('throws a RangeError naming the function for a wpm that is not positive and finite', () => {
  for (const bad of [0, -1, -200, NaN, Infinity, -Infinity, '200', null]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('checks the text before the rate', () => {
  for (const badRate of [0, NaN, '200']) {
    assert.throws(() => readingTimeMinutes(5, badRate), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts hyphenated compounds, contractions and decimals the way wordCount does', () => {
  // A, well-known, cat, doesn't, weigh, 3, 14, kilos
  const text = "A well-known cat doesn't weigh 3.14 kilos.";
  assert.equal(wordCount(text), 8);
  assert.equal(readingTimeMinutes(text, 1), 8);
  assert.equal(readingTimeMinutes(text, 4), 2);
  assert.equal(readingTimeMinutes('well-known', 1), 1);
  assert.equal(readingTimeMinutes("doesn't", 1), 1);
  assert.equal(readingTimeMinutes('3.14', 1), 2);
});

test('rounds a three-paragraph text of 270 words up to two minutes', () => {
  const sentence = 'The quick brown fox jumps over the lazy dog.';
  const paragraph = Array.from({ length: 10 }, () => sentence).join(' ');
  const text = [paragraph, paragraph, paragraph].join('\n\n');
  assert.equal(wordCount(text), 270);
  assert.equal(readingTimeMinutes(text), 2);
});

test('returns the same result when called twice with the same arguments', () => {
  const text = words(250);
  assert.equal(readingTimeMinutes(text, 100), readingTimeMinutes(text, 100));
  assert.equal(readingTimeMinutes(text), readingTimeMinutes(text));
});
