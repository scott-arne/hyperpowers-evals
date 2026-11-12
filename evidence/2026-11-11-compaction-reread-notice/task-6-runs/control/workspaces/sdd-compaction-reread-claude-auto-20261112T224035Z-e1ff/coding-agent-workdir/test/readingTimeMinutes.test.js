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

// Nine words per sentence, ten sentences per paragraph, three paragraphs:
// 270 words, which is two minutes at the default rate.
const SENTENCE = 'The old keeper climbed the tower to light it.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const MULTI_PARAGRAPH = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

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

test('has a multi-paragraph passage of 270 words that takes two minutes', () => {
  assert.equal(MULTI_PARAGRAPH.match(/[A-Za-z]+/g).length, 270);
  assert.equal(readingTimeMinutes(MULTI_PARAGRAPH), 2);
});

test('uses the default rate of 200 when wpm is undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('throws a RangeError naming the function for zero or a negative wpm', () => {
  for (const bad of [0, -0, -1, -200]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('throws a RangeError naming the function for NaN and the infinities', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('throws a RangeError naming the function for a non-number wpm, including numeric strings and null', () => {
  for (const bad of ['200', '', null, true, {}, [200], 10n]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(42, -1), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
  assert.throws(() => readingTimeMinutes(undefined, NaN), TypeError);
});

test('validates the rate even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('accepts a fractional wpm', () => {
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
  assert.equal(readingTimeMinutes('a b c', 0.5), 6);
});

test('counts hyphenated compounds, contractions and decimals as wordCount does', () => {
  // well-known (1) + don't (1) + 3.14 (2: "3" and "14" joined only by a period) = 4 words
  assert.equal(readingTimeMinutes('well-known don\'t 3.14', 1), 4);
  assert.equal(readingTimeMinutes('well-known', 1), 1);
  assert.equal(readingTimeMinutes("don't", 1), 1);
});

test('does not mutate its arguments', () => {
  const text = 'one two three';
  const wpm = 2;
  readingTimeMinutes(text, wpm);
  assert.equal(text, 'one two three');
  assert.equal(wpm, 2);
});
