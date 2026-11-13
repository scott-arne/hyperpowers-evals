const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// Three paragraphs of ten copies of a nine-word sentence: 270 words.
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

test('returns 2 for a three-paragraph text of 270 words at the default rate', () => {
  assert.equal(readingTimeMinutes(PASSAGE), 2);
});

test('returns 1 for the same 270-word text at a rate of 270 words per minute', () => {
  assert.equal(readingTimeMinutes(PASSAGE, 270), 1);
});

test('throws a RangeError naming the function for a non-positive wpm', () => {
  for (const bad of [0, -1, -200]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('throws a RangeError naming the function for a non-finite wpm', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('throws a RangeError naming the function for a wpm that is not a number', () => {
  for (const bad of ['200', null]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('accepts a fractional wpm and rounds the result up', () => {
  // 301 / 150.5 is exactly 2; 302 / 150.5 is just over 2, so it rounds up to 3.
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('uses the default rate of 200 when wpm is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('checks the text before the rate', () => {
  for (const badWpm of [0, NaN, '200']) {
    assert.throws(() => readingTimeMinutes(12, badWpm), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts a hyphenated compound as one word at the minute boundary', () => {
  assert.equal(readingTimeMinutes(`${words(199)} well-known`), 1);
  assert.equal(readingTimeMinutes(`${words(200)} well-known`), 2);
});

test('counts a contraction as one word at the minute boundary', () => {
  assert.equal(readingTimeMinutes(`${words(199)} don't`), 1);
  assert.equal(readingTimeMinutes(`${words(199)} don’t`), 1);
});

test('counts a decimal number as two words at the minute boundary', () => {
  assert.equal(readingTimeMinutes(`${words(198)} 3.14`), 1);
  assert.equal(readingTimeMinutes(`${words(199)} 3.14`), 2);
});
