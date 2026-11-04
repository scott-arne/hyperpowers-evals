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
  ["x x x x", 2, 2],
  ["x x x x x", 2, 3],
  ["x x x x", 4, 1],
  ["x x x x x", 4, 2],
  ["x x x x x x x x", 4, 2],
  ["x x x x x x x x x", 4, 3],
  ["x", 0.5, 2],
  ["x x", 0.5, 4],
  ["x", 0.25, 4],
  ["x", 1000, 1],
  ["x x x x x x x x x x", 3, 4],
  ["x x x x x x x x x x", 5, 2],
  ["x x x x x x x x x x", 10, 1],
  ["x x x x x x x x x x", 11, 1],
  ["x x x x x x x x x x x", 10, 2],
  ["a-b c'd", 1, 2],
  ["a-b c'd", 2, 1],
  ["a b. c d! e f?", 2, 3],
  ["1 2 3 4 5 6", 6, 1],
  ["1 2 3 4 5 6 7", 6, 2],
  ["...", 1, 0],
  ["--", 10, 0],
  ["\n", 10, 0],
  ["日本語 テキスト", 1, 2],
  ["日本語 テキスト", 2, 1],
  ["é", 1, 1],
  ["é è", 1, 2],
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

test('returns 5 for 1000 words at the default rate', () => {
  assert.equal(readingTimeMinutes(words(1000)), 5);
});

test('uses a custom rate', () => {
  assert.equal(readingTimeMinutes(words(250), 100), 3);
});

test('a faster rate shortens the time', () => {
  assert.equal(readingTimeMinutes(words(600), 300), 2);
});

test('accepts a fractional rate', () => {
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('treats an explicit undefined rate as the default', () => {
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('counts words the same way wordCount does', () => {
  assert.equal(readingTimeMinutes("well-known, don't stop — 3.14 times"), 1);
  assert.equal(readingTimeMinutes("well-known, don't stop — 3.14 times", 3), 2);
});

test('counts a multi-paragraph text', () => {
  const paragraph = 'The keeper lit the lamp and watched the water. '.repeat(10);
  const text = `${paragraph}\n\n${paragraph}\n\n${paragraph}`;
  // 9 words per sentence, 30 sentences, 270 words.
  assert.equal(readingTimeMinutes(text), 2);
});

test('rejects a rate of zero', () => {
  assert.throws(() => readingTimeMinutes('a b c', 0), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('rejects a negative rate', () => {
  assert.throws(() => readingTimeMinutes('a b c', -200), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('rejects NaN and infinite rates', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('rejects a rate that is not a number', () => {
  for (const bad of ['200', null, {}, [200]]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
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

test('gives the same answer when called twice', () => {
  const text = words(333);
  assert.equal(readingTimeMinutes(text), readingTimeMinutes(text));
});

test('matches every row of the reference table', () => {
  for (const [text, wpm, expected] of CASES) {
    const actual = wpm === null ? readingTimeMinutes(text) : readingTimeMinutes(text, wpm);
    assert.equal(actual, expected, JSON.stringify([text, wpm]));
  }
});
