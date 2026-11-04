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

// Added tests, one per behaviour bullet in the brief.

// Nine words per sentence; ten sentences per paragraph; three paragraphs.
// 9 * 10 * 3 = 270 words, and ceil(270 / 200) = 2.
const SENTENCE = 'The keeper lit the lamp at dusk each night.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const PASSAGE = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

test('returns 2 for a three-paragraph passage of 270 words at the default rate', () => {
  assert.equal(readingTimeMinutes(PASSAGE), 2);
});

test('uses the default rate of 200 when wpm is explicitly undefined', () => {
  // 201 words: ceil(201 / 200) = 2, whereas a rate above 201 would give 1.
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
});

test('divides by a custom rate and rounds up', () => {
  // 5 words at 2 wpm: ceil(5 / 2) = 3.
  assert.equal(readingTimeMinutes(words(5), 2), 3);
});

test('accepts a fractional rate', () => {
  // 151 words at 150.5 wpm: 151 / 150.5 is just over 1, so ceil gives 2.
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
  // 150 words at 150.5 wpm: 150 / 150.5 is just under 1, so ceil gives 1.
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
});

test('throws a RangeError naming the function for an invalid rate', () => {
  const invalid = [0, -1, -200, NaN, Infinity, -Infinity, '200', null];
  for (const bad of invalid) {
    assert.throws(() => readingTimeMinutes('some words here', bad), (err) => {
      assert.ok(err instanceof RangeError, `wpm ${String(bad)}`);
      assert.ok(err.message.startsWith('readingTimeMinutes:'), `wpm ${String(bad)}`);
      return true;
    });
  }
});

test('rejects an invalid rate even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(42, 0), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
  assert.throws(() => readingTimeMinutes(null, NaN), TypeError);
});

test('counts a hyphenated compound as one word', () => {
  // "well-known" is 1 word: ceil(1 / 1) = 1 (two words would give 2).
  assert.equal(readingTimeMinutes('well-known', 1), 1);
});

test('counts a contraction as one word', () => {
  assert.equal(readingTimeMinutes("don't", 1), 1);
});

test('counts a decimal as two words', () => {
  // "3.14" splits at the period into "3" and "14": ceil(2 / 1) = 2.
  assert.equal(readingTimeMinutes('3.14', 1), 2);
});

test('returns the same value on repeated calls', () => {
  assert.equal(readingTimeMinutes(PASSAGE), readingTimeMinutes(PASSAGE));
});
