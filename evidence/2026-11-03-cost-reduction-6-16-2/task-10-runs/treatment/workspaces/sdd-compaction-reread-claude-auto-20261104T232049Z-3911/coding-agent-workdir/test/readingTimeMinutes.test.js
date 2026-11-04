const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wordCount, readingTimeMinutes } = require('../src/textstats');

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

// Ten copies of a nine-word sentence per paragraph, three paragraphs: 270 words.
test('returns 2 for a 270-word multi-paragraph passage', () => {
  const sentence = 'The quick brown fox jumps over the lazy dog.';
  const paragraph = Array.from({ length: 10 }, () => sentence).join(' ');
  const passage = [paragraph, paragraph, paragraph].join('\n\n');
  assert.equal(readingTimeMinutes(passage), 2);
});

test('throws a RangeError naming the function for an invalid wpm', () => {
  const bad = [0, -1, -0.5, NaN, Infinity, -Infinity, '200', '0', null, true, {}, []];
  for (const wpm of bad) {
    assert.throws(() => readingTimeMinutes('hello', wpm), (err) => {
      assert.ok(err instanceof RangeError, `wpm ${String(wpm)}`);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    }, `wpm ${String(wpm)}`);
  }
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(12, 0), TypeError);
});

test('accepts a fractional wpm', () => {
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
});

test('uses the default rate when wpm is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

// Token rules come from wordCount: a hyphenated compound and a contraction are
// one word each, and a decimal is two ("3" and "14"). At 1 wpm minutes == words.
test('counts hyphenated compounds, contractions and decimals as wordCount does', () => {
  const text = "well-known don't 3.14";
  assert.equal(wordCount(text), 4);
  assert.equal(readingTimeMinutes(text, 1), 4);
  assert.equal(readingTimeMinutes('well-known', 1), 1);
  assert.equal(readingTimeMinutes("don't", 1), 1);
  assert.equal(readingTimeMinutes('don’t', 1), 1);
  assert.equal(readingTimeMinutes('3.14', 1), 2);
});
