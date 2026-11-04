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

// Added per the owner decision: passage values and uncovered rules.

// Nine plain words per sentence; ten sentences per paragraph; three paragraphs.
const SENTENCE = 'The quick brown fox jumps over the lazy dog.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const PASSAGE = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

test('rounds a 270-word three-paragraph passage up to two minutes at the default rate', () => {
  assert.equal(readingTimeMinutes(PASSAGE), 2);
});

test('uses the supplied rate for the 270-word passage', () => {
  assert.equal(readingTimeMinutes(PASSAGE, 270), 1);
  assert.equal(readingTimeMinutes(PASSAGE, 269), 2);
  assert.equal(readingTimeMinutes(PASSAGE, 100), 3);
});

test('throws a RangeError naming the function for a non-positive or non-finite rate', () => {
  for (const bad of [0, -0, -1, -200, NaN, Infinity, -Infinity]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('throws a RangeError for a rate that is not a number', () => {
  for (const bad of ['200', '1', '', null, true, {}, [200]]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('validates the rate even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('allows a fractional rate', () => {
  // 301 / 150.5 = 2 exactly; 302 / 150.5 is just over 2.
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
  assert.equal(readingTimeMinutes('a b c', 0.5), 6);
});

test('uses the default rate of 200 when wpm is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes('', undefined), 0);
});

test('checks the text before the rate', () => {
  for (const badWpm of [0, -1, NaN, '200', null]) {
    assert.throws(() => readingTimeMinutes(12, badWpm), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts a hyphenated compound as one word', () => {
  // "well-known" and "state-of-the-art" are one word each.
  assert.equal(readingTimeMinutes('well-known state-of-the-art', 1), 2);
});

test('counts a contraction as one word', () => {
  assert.equal(readingTimeMinutes("don't can't won't", 1), 3);
});

test('counts the two sides of a decimal number as two words, as Task 1 defines', () => {
  // "3.14" is "3" and "14"; so three decimals are six words.
  assert.equal(readingTimeMinutes('3.14 2.5 10.25', 1), 6);
});
