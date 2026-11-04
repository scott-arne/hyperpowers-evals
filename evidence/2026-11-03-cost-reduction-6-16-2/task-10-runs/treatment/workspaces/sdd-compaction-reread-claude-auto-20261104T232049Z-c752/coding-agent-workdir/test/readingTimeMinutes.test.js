const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// Three paragraphs of ten copies of a nine-word sentence each: 270 words.
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

test('returns 2 for a three-paragraph passage of 270 words at the default rate', () => {
  assert.equal(wordCount(PASSAGE), 270);
  assert.equal(readingTimeMinutes(PASSAGE), 2);
});

test('throws a RangeError naming the function for a zero rate', () => {
  assert.throws(() => readingTimeMinutes('hello', 0), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('throws a RangeError naming the function for a negative rate', () => {
  for (const bad of [-1, -200, -0.5]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('throws a RangeError naming the function for NaN and the infinities', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('throws a RangeError naming the function for a numeric string rate', () => {
  for (const bad of ['200', '1', ' 5 ']) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('throws a RangeError naming the function for null and other non-number rates', () => {
  for (const bad of [null, true, false, {}, [], [200], () => 200, 10n, Symbol('wpm')]) {
    assert.throws(() => readingTimeMinutes('hello', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('uses the default rate of 200 when the rate is explicitly undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('accepts a fractional rate and rounds the result up', () => {
  // 301 words / 150.5 = 2.0 exactly; 302 words / 150.5 is just over 2.
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
  assert.equal(readingTimeMinutes('hello', 0.5), 2);
});

test('throws a TypeError rather than a RangeError for a non-string text with a bad rate', () => {
  for (const [text, wpm] of [[42, 0], [null, NaN], [undefined, '200'], [{}, -1]]) {
    assert.throws(() => readingTimeMinutes(text, wpm), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts hyphenated compounds, contractions and decimals the way wordCount does', () => {
  const text = `${words(197)} well-known don't 3.14`;
  // "3.14" is two words under Task 1's rules, so the total is 197 + 1 + 1 + 2.
  assert.equal(wordCount(text), 201);
  assert.equal(readingTimeMinutes(text, 201), 1);
  assert.equal(readingTimeMinutes(text, 200), 2);
  for (const sample of ['well-known', "don't", 'it’s', '3.14', 'state-of-the-art plan', 'a-b c\'d 1.5']) {
    const n = wordCount(sample);
    assert.equal(readingTimeMinutes(sample, 1), n, sample);
  }
});
