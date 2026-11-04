const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readingTimeMinutes, wordCount } = require('../src/textstats');

// n copies of a one-word token, so the word count is exactly n.
const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

// Three paragraphs, each ten copies of one nine-word sentence: 270 words.
const SENTENCE = 'The old lighthouse keeper watched the grey sea slowly.';
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

test('returns 2 for a 270-word text spread over three paragraphs', () => {
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

test('applies the default rate of 200 when wpm is omitted', () => {
  assert.equal(readingTimeMinutes(words(200)), readingTimeMinutes(words(200), 200));
  assert.equal(readingTimeMinutes(words(201)), readingTimeMinutes(words(201), 200));
});

test('applies the default rate of 200 when wpm is undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
});

test('allows a fractional wpm', () => {
  assert.equal(readingTimeMinutes(words(301), 150.5), Math.ceil(301 / 150.5));
  assert.equal(readingTimeMinutes(words(301), 150.5), 2);
  assert.equal(readingTimeMinutes(words(302), 150.5), Math.ceil(302 / 150.5));
  assert.equal(readingTimeMinutes(words(302), 150.5), 3);
});

test('throws a RangeError naming the function for an invalid wpm', () => {
  for (const bad of [0, -1, -200, NaN, Infinity, -Infinity, '200', null]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('checks the text before the rate', () => {
  for (const badText of [undefined, null, 12, {}]) {
    for (const badWpm of [0, -1, NaN, '200']) {
      assert.throws(() => readingTimeMinutes(badText, badWpm), (err) => {
        assert.ok(err instanceof TypeError);
        assert.ok(err.message.startsWith('readingTimeMinutes:'));
        return true;
      });
    }
  }
});

test('counts words by the same rules as wordCount', () => {
  const samples = [
    'a well-known fact',
    "don't won't can’t",
    'pi is 3.14 and e is 2.718',
    'state-of-the-art, mother-in-law; it\'s 3.14.',
    PASSAGE,
  ];
  for (const text of samples) {
    assert.equal(readingTimeMinutes(text, 1), wordCount(text), text);
  }
  assert.equal(readingTimeMinutes('well-known', 1), 1);
  assert.equal(readingTimeMinutes("don't", 1), 1);
});
