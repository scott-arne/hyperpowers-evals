const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// A nine-word sentence; ten per paragraph, three paragraphs, is 270 words.
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

test('rounds a 270-word multi-paragraph passage up to two minutes', () => {
  assert.equal(wordCount(PASSAGE), 270);
  assert.equal(readingTimeMinutes(PASSAGE), 2);
});

test('scales the multi-paragraph passage with a custom rate', () => {
  assert.equal(readingTimeMinutes(PASSAGE, 270), 1);
  assert.equal(readingTimeMinutes(PASSAGE, 90), 3);
  assert.equal(readingTimeMinutes(PASSAGE, 100), 3);
});

test('uses the default rate of 200 when wpm is undefined', () => {
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
});

test('accepts a fractional rate', () => {
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
  assert.equal(readingTimeMinutes('a b', 0.5), 4);
});

test('throws a RangeError naming the function for an invalid rate', () => {
  const bad = [0, -0, -1, -200, NaN, Infinity, -Infinity, '200', '150.5', null, true, {}, []];
  for (const wpm of bad) {
    assert.throws(() => readingTimeMinutes('some words', wpm), (err) => {
      assert.ok(err instanceof RangeError, String(wpm));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(wpm));
      return true;
    });
  }
});

test('validates the rate even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(42, 0), TypeError);
  assert.throws(() => readingTimeMinutes(undefined, NaN), TypeError);
});

test('counts words the way wordCount does', () => {
  const text = `${words(195)} well-known don't 3.14 e-mail`;
  // well-known, don't, 3.14 -> "3" and "14" (two words), e-mail: 195 + 1 + 1 + 2 + 1
  assert.equal(wordCount(text), 200);
  assert.equal(readingTimeMinutes(text), 1);
  assert.equal(readingTimeMinutes(`${text} more`), 2);
});
