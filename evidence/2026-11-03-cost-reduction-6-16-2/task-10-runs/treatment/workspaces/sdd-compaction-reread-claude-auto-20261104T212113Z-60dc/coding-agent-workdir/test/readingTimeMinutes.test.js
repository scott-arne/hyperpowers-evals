const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// Three paragraphs of ten copies of a nine-word sentence: 270 words
// (confirmed independently with `wc -w`), so two minutes at the default rate.
const SENTENCE = 'The old keeper climbed the tower before the storm.';
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

test('returns 2 for a 270-word multi-paragraph passage at the default rate', () => {
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

test('uses 200 words per minute when wpm is passed as undefined', () => {
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
});

test('accepts a fractional wpm', () => {
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('throws a RangeError naming the function for an out-of-range wpm', () => {
  const bad = [0, -0, -1, -200, NaN, Infinity, -Infinity, '200', '150.5', null, true, {}, [200]];
  for (const wpm of bad) {
    assert.throws(() => readingTimeMinutes('a b c', wpm), (err) => {
      assert.ok(err instanceof RangeError, String(wpm));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(wpm));
      return true;
    });
  }
});

test('throws a RangeError for a bad wpm even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(12, 0), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('counts hyphenated compounds, contractions and decimals as wordCount does', () => {
  // well-known (1), don't (1), 3.14 (2: "3" and "14") -> 4 words
  assert.equal(readingTimeMinutes('well-known don\'t 3.14', 1), 4);
  assert.equal(readingTimeMinutes('well-known don\'t 3.14', 4), 1);
});
