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

// Added tests (human-partner decision) follow.

const SENTENCE = 'The quick brown fox jumps over the lazy dog.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const PASSAGE = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

test('returns 2 for a three-paragraph passage of 270 words at the default rate', () => {
  assert.equal(readingTimeMinutes(PASSAGE), 2);
});

test('uses 200 words per minute when wpm is omitted', () => {
  assert.equal(readingTimeMinutes(words(200)), 1);
  assert.equal(readingTimeMinutes(words(201)), 2);
});

test('uses 200 words per minute when wpm is undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('applies a non-default wpm', () => {
  assert.equal(readingTimeMinutes(words(100), 50), 2);
  assert.equal(readingTimeMinutes(words(101), 50), 3);
});

test('accepts a fractional wpm', () => {
  // 301 / 150.5 is exactly 2; 302 / 150.5 is just over 2.
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('throws a RangeError naming the function for an invalid wpm', () => {
  const invalid = [0, -1, -200, NaN, Infinity, -Infinity, '200', null, {}];
  for (const bad of invalid) {
    assert.throws(() => readingTimeMinutes('some text', bad), (err) => {
      assert.ok(err instanceof RangeError, `wpm ${String(bad)}`);
      assert.ok(err.message.startsWith('readingTimeMinutes:'), `wpm ${String(bad)}`);
      return true;
    });
  }
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(42, 0), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('counts a hyphenated compound as one word', () => {
  assert.equal(readingTimeMinutes('well-known state-of-the-art', 1), 2);
});

test('counts a contraction as one word', () => {
  assert.equal(readingTimeMinutes("don't can't", 1), 2);
});

test('counts a decimal number as two words, as wordCount does', () => {
  assert.equal(readingTimeMinutes('pi is 3.14', 1), 4);
});
