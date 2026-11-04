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

test('returns 2 for three paragraphs of ten nine-word sentences each', () => {
  const sentence = 'The quick brown fox jumps over the lazy dog.';
  const paragraph = Array.from({ length: 10 }, () => sentence).join(' ');
  const text = [paragraph, paragraph, paragraph].join('\n\n');
  assert.equal(readingTimeMinutes(text), 2);
});

test('throws a RangeError naming the function for a rate that is not positive and finite', () => {
  for (const bad of [0, -1, -200, NaN, Infinity, -Infinity]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('throws a RangeError naming the function for a rate that is not a number', () => {
  for (const bad of ['200', null, {}, [200], true]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('accepts a fractional rate and rounds up', () => {
  // 301 words / 150.5 is exactly 2; 302 words is just over, so the ceiling is 3.
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
});

test('accepts a rate below one word per minute', () => {
  assert.equal(readingTimeMinutes('a b', 0.5), 4);
});

test('uses the default rate of 200 when the rate is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('checks the text before the rate', () => {
  for (const badRate of [0, NaN, '200']) {
    assert.throws(() => readingTimeMinutes(12, badRate), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts a hyphenated compound as one word', () => {
  assert.equal(readingTimeMinutes('well-known well-known well-known', 2), 2);
  assert.equal(readingTimeMinutes('well-known', 1), 1);
});

test('counts a contraction as one word', () => {
  assert.equal(readingTimeMinutes("don't can't won't", 3), 1);
  assert.equal(readingTimeMinutes("don't can't won't", 2), 2);
});

test('counts a decimal number as two words, the way wordCount does', () => {
  assert.equal(wordCount('pi is 3.14'), 4);
  assert.equal(readingTimeMinutes('pi is 3.14', 4), 1);
  assert.equal(readingTimeMinutes('pi is 3.14', 3), 2);
});
