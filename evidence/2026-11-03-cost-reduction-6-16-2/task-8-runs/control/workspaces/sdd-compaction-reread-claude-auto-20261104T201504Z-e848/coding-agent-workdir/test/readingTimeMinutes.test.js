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

test('returns 2 for a three-paragraph text of 270 words at the default rate', () => {
  const sentence = 'The quick brown fox jumps over the lazy dog.';
  const paragraph = Array.from({ length: 10 }, () => sentence).join(' ');
  const text = [paragraph, paragraph, paragraph].join('\n\n');
  assert.equal(wordCount(text), 270);
  assert.equal(readingTimeMinutes(text), 2);
});

test('uses the default rate when wpm is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('accepts a fractional rate and uses it exactly', () => {
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('throws a RangeError naming the function for a rate of zero or less', () => {
  for (const bad of [0, -1, -200]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    }, String(bad));
  }
});

test('throws a RangeError naming the function for a NaN or infinite rate', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    }, String(bad));
  }
});

test('throws a RangeError naming the function for a rate that is not a number', () => {
  for (const bad of ['200', null, {}]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    }, String(bad));
  }
});

test('throws a RangeError for an invalid rate even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  for (const badWpm of [0, NaN, '200']) {
    assert.throws(() => readingTimeMinutes(42, badWpm), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts hyphenated compounds as one word each', () => {
  const text = 'state-of-the-art well-known e-mail';
  assert.equal(wordCount(text), 3);
  assert.equal(readingTimeMinutes(text, 1), 3);
});

test('counts contractions as one word each', () => {
  const text = "don't can’t it's";
  assert.equal(wordCount(text), 3);
  assert.equal(readingTimeMinutes(text, 1), 3);
});

test('counts a decimal the way wordCount does', () => {
  const text = 'pi is 3.14 or 2.5';
  assert.equal(wordCount(text), 7);
  assert.equal(readingTimeMinutes(text, 1), 7);
});
