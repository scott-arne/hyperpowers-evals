const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// Three paragraphs, each ten copies of one nine-word sentence of plain words:
// 3 * 10 * 9 = 270 words.
const SENTENCE = 'The old keeper climbed the tower every night again.';
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

test('returns 2 for a 270-word, three-paragraph passage', () => {
  assert.equal(wordCount(PASSAGE), 270);
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

test('uses the default rate of 200 when wpm is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('accepts a fractional wpm and uses it exactly', () => {
  // 151 / 150.5 rounds up to 2; a rate rounded to 151 would give 1.
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
  // 201 / 100.5 is exactly 2; a rate truncated to 100 would give 3.
  assert.equal(readingTimeMinutes(words(201), 100.5), 2);
  // 150 / 150.5 is just under 1.
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
});

test('throws a RangeError naming the function for an invalid wpm', () => {
  for (const bad of [0, -1, -200, NaN, Infinity, -Infinity, '200', null]) {
    assert.throws(() => readingTimeMinutes('some words', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    }, String(bad));
  }
});

test('throws a RangeError for an invalid wpm even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  for (const bad of [0, NaN, '200', null]) {
    assert.throws(() => readingTimeMinutes(42, bad), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts hyphenated compounds, contractions and decimals as wordCount does', () => {
  // well-known, state-of-the-art, don't, 3 and 14 are five words; splitting on
  // whitespace would give four and a result of 2 instead of 3.
  const text = 'well-known state-of-the-art don\'t 3.14';
  assert.equal(wordCount(text), 5);
  assert.equal(readingTimeMinutes(text, 2), 3);
});
