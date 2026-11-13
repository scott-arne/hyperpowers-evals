const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array(n).fill('word').join(' ');

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

// Decision D1: Add test with 270-word text (3 paragraphs, 10 copies of a 9-word sentence each)
test('reads a 270-word text as 2 minutes at the default rate', () => {
  const nineWordSentence = 'the quick brown fox jumps over the lazy dog';
  const paragraph = Array(10).fill(nineWordSentence).join(' ');
  const text = [paragraph, paragraph, paragraph].join('\n\n');

  assert.equal(wordCount(text), 270, 'text should have exactly 270 words');
  assert.equal(readingTimeMinutes(text), 2, 'reading time should be 2 minutes at 200 wpm');
});

// Decision D2: Tests for wpm parameter behavior
test('uses 200 as the default wpm when wpm is omitted', () => {
  assert.equal(readingTimeMinutes(words(200)), 1);
  assert.equal(readingTimeMinutes(words(201)), 2);
});

test('uses 200 as the default wpm when wpm is passed as undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('accepts fractional wpm values', () => {
  // 150.5 wpm: 300 words / 150.5 = 1.993... => ceil = 2
  // 150 words / 150.5 = 0.996... => ceil = 1
  assert.equal(readingTimeMinutes(words(300), 150.5), 2);
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
});

test('throws RangeError for wpm of 0', () => {
  assert.throws(() => readingTimeMinutes('text', 0), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('throws RangeError for negative wpm', () => {
  assert.throws(() => readingTimeMinutes('text', -100), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('throws RangeError for NaN wpm', () => {
  assert.throws(() => readingTimeMinutes('text', NaN), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('throws RangeError for Infinity wpm', () => {
  assert.throws(() => readingTimeMinutes('text', Infinity), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('throws RangeError for -Infinity wpm', () => {
  assert.throws(() => readingTimeMinutes('text', -Infinity), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('throws RangeError for numeric string wpm like "200"', () => {
  assert.throws(() => readingTimeMinutes('text', '200'), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('throws RangeError for null wpm', () => {
  assert.throws(() => readingTimeMinutes('text', null), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('checks text type before rate when both are invalid', () => {
  assert.throws(() => readingTimeMinutes(null, 0), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('readingTimeMinutes:'));
    return true;
  });
});

test('counts words the same way wordCount does for hyphenated compounds', () => {
  assert.equal(readingTimeMinutes('well-known', 1), 1);
});

test('counts words the same way wordCount does for contractions', () => {
  assert.equal(readingTimeMinutes("don't shouldn't won't", 1), 3);
});

test('counts words the same way wordCount does for decimals', () => {
  assert.equal(readingTimeMinutes('3.14 2.71 1.41', 1), 6);
});

test('calling twice returns equal values and does not mutate', () => {
  const text = 'hello world this is a test of the function';
  const first = readingTimeMinutes(text, 100);
  const second = readingTimeMinutes(text, 100);
  assert.equal(first, second);
});
