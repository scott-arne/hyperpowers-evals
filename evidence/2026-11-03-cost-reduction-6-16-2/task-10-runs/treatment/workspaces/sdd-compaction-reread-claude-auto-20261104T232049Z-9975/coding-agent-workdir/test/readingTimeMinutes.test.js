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

test('returns 2 for three paragraphs totalling 270 words', () => {
  const paragraph = Array.from({ length: 10 }, () => 'The quick brown fox jumps over the lazy dog.').join(' ');
  const text = [paragraph, paragraph, paragraph].join('\n\n');
  assert.equal(wordCount(text), 270);
  assert.equal(readingTimeMinutes(text), 2);
});

test('throws a RangeError naming the function for a rate that is not a positive finite number', () => {
  for (const bad of [0, -1, -200, NaN, Infinity, -Infinity, '200', null, true, {}, [200], 10n]) {
    assert.throws(() => readingTimeMinutes('hello world', bad), (err) => {
      assert.ok(err instanceof RangeError, `expected RangeError for ${String(bad)}`);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('treats an explicit undefined rate as the default of 200', () => {
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
});

test('allows a fractional rate', () => {
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
});

test('checks the text before the rate', () => {
  for (const badRate of [0, NaN, '200']) {
    assert.throws(() => readingTimeMinutes(42, badRate), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts words the way wordCount does for compounds, contractions and decimals', () => {
  const text = "A well-known state-of-the-art rule: don't pay 3.14 for it";
  assert.equal(readingTimeMinutes(text, 1), wordCount(text));
  assert.equal(wordCount(text), 10);
});
