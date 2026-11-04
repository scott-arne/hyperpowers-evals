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

test('reads a three-paragraph text of 270 words as two minutes', () => {
  // Nine plain words per sentence; ten sentences per paragraph is 90 words;
  // three paragraphs is 270 words, and ceil(270 / 200) is 2.
  const sentence = 'The quick brown fox jumps over the lazy dog.';
  const paragraph = Array.from({ length: 10 }, () => sentence).join(' ');
  const text = [paragraph, paragraph, paragraph].join('\n\n');
  assert.equal(wordCount(text), 270);
  assert.equal(readingTimeMinutes(text), 2);
});

test('uses the default rate when wpm is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes('', undefined), 0);
});

test('accepts a fractional rate', () => {
  // 3 / 1.5 is exactly 2.
  assert.equal(readingTimeMinutes('x x x', 1.5), 2);
  // 4 / 1.5 is 2.67, rounded up to 3.
  assert.equal(readingTimeMinutes('x x x x', 1.5), 3);
  // 1 / 0.5 is exactly 2.
  assert.equal(readingTimeMinutes('x', 0.5), 2);
});

test('throws a RangeError naming the function for a bad rate', () => {
  const bad = [0, -1, -0.5, NaN, Infinity, -Infinity, '200', '', null, true, false, {}, [], [200], 10n];
  for (const wpm of bad) {
    assert.throws(() => readingTimeMinutes('some words', wpm), (err) => {
      assert.ok(err instanceof RangeError, `class for ${String(wpm)}`);
      assert.ok(err.message.startsWith('readingTimeMinutes:'), `prefix for ${String(wpm)}`);
      return true;
    });
  }
});

test('validates the rate even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  for (const [text, wpm] of [[12, 0], [undefined, NaN], [null, -1], [{}, '200']]) {
    assert.throws(() => readingTimeMinutes(text, wpm), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts hyphenated compounds, contractions and decimals as wordCount does', () => {
  // At one word per minute the result is the word count itself.
  const rows = [
    ['state-of-the-art', 1],   // one hyphenated compound
    ["don't can't", 2],        // two contractions
    ['3.14', 2],               // a period is not a joiner: "3" and "14"
    ['well-known dog\'s 2.5 end-', 5], // well-known, dog's, 2, 5, end
  ];
  for (const [text, expected] of rows) {
    assert.equal(wordCount(text), expected, text);
    assert.equal(readingTimeMinutes(text, 1), expected, text);
  }
});
