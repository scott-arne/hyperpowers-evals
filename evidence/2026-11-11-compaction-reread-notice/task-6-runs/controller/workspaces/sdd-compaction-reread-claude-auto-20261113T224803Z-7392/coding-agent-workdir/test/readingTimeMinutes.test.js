const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

// Three paragraphs of ten copies of one nine-word sentence: 270 words.
const SENTENCE = 'The old lighthouse keeper climbed the winding stairs slowly.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const PASSAGE = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

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

test('counts the words of a multi-paragraph passage', () => {
  assert.equal(wordCount(PASSAGE), 270);
});

test('rounds a 270-word multi-paragraph passage up to two minutes', () => {
  assert.equal(readingTimeMinutes(PASSAGE), 2);
});

test('throws a RangeError naming the function for an invalid wpm', () => {
  for (const bad of [0, -1, NaN, Infinity, -Infinity, '200', null]) {
    assert.throws(() => readingTimeMinutes('some words', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('uses the default rate of 200 when wpm is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('accepts a fractional wpm', () => {
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(42, 0), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('counts hyphenated compounds the way wordCount does', () => {
  const text = 'a well-known state-of-the-art plan';
  assert.equal(wordCount(text), 4);
  assert.equal(readingTimeMinutes(text, 1), 4);
});

test('counts contractions the way wordCount does', () => {
  const text = "don't stop, it's fine";
  assert.equal(wordCount(text), 4);
  assert.equal(readingTimeMinutes(text, 1), 4);
});

test('counts decimals the way wordCount does', () => {
  const text = 'pi is 3.14 today';
  assert.equal(readingTimeMinutes(text, 1), wordCount(text));
});
