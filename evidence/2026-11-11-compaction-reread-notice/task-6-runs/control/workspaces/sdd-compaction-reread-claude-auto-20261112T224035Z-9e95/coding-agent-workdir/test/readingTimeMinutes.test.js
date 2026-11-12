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

// Ten copies of a nine-word sentence per paragraph, three paragraphs: 270 words.
const SENTENCE = 'The quick brown fox jumps over the lazy dog.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const MULTI_PARAGRAPH = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

const assertRangeError = (fn) => {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
};

test('returns 2 for a 270-word text spread over three paragraphs', () => {
  assert.equal(wordCount(MULTI_PARAGRAPH), 270);
  assert.equal(readingTimeMinutes(MULTI_PARAGRAPH), 2);
});

test('throws a RangeError naming the function for an invalid rate', () => {
  for (const bad of [0, -1, NaN, Infinity, -Infinity, '200', null]) {
    assertRangeError(() => readingTimeMinutes('hello', bad));
  }
});

test('treats an explicit undefined rate like an omitted one', () => {
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
});

test('accepts a fractional rate', () => {
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
});

test('checks the text before the rate', () => {
  assert.throws(() => readingTimeMinutes(null, 0), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('counts words the way wordCount does', () => {
  // A, well-known, author, doesn't, read, 3, 14, books
  const text = "A well-known author doesn't read 3.14 books";
  assert.equal(wordCount(text), 8);
  assert.equal(readingTimeMinutes(text, 1), wordCount(text));
  assert.equal(readingTimeMinutes(text, 1), 8);
});

test('uses an explicit non-default rate', () => {
  assert.equal(readingTimeMinutes(words(300), 100), 3);
  assert.equal(readingTimeMinutes(words(301), 100), 4);
});
