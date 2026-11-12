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

// ---------------------------------------------------------------------------
// Added tests (human partner decision "Extend tests"): behaviour the plan
// states in prose that the verbatim tests above do not check.
// ---------------------------------------------------------------------------

// Nine words under the tokenizer: The keeper climbed the old tower every night again.
const SENTENCE = 'The keeper climbed the old tower every night again.';
const PARAGRAPH = Array.from({ length: 10 }, () => SENTENCE).join(' ');
const MULTI_PARAGRAPH = [PARAGRAPH, PARAGRAPH, PARAGRAPH].join('\n\n');

test('the multi-paragraph sample is exactly 270 words', () => {
  assert.equal(wordCount(SENTENCE), 9);
  assert.equal(wordCount(MULTI_PARAGRAPH), 270);
});

test('returns 2 for three paragraphs totalling 270 words at the default rate', () => {
  assert.equal(readingTimeMinutes(MULTI_PARAGRAPH), 2);
});

test('uses the default rate of 200 when wpm is undefined', () => {
  assert.equal(readingTimeMinutes(words(200), undefined), 1);
  assert.equal(readingTimeMinutes(words(201), undefined), 2);
  assert.equal(readingTimeMinutes('', undefined), 0);
});

test('accepts a fractional wpm and rounds up against it', () => {
  // 150 words / 150.5 is just under 1; 151 words is just over 1 (but 1 at the default rate).
  assert.equal(readingTimeMinutes(words(150), 150.5), 1);
  assert.equal(readingTimeMinutes(words(151), 150.5), 2);
  assert.equal(readingTimeMinutes(words(151)), 1);
});

test('accepts a wpm below 1', () => {
  assert.equal(readingTimeMinutes(words(3), 0.5), 6);
});

test('throws a RangeError naming the function for zero and negative wpm', () => {
  for (const bad of [0, -0, -1, -200, -0.5]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('throws a RangeError naming the function for NaN and the infinities', () => {
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), String(bad));
      return true;
    });
  }
});

test('throws a RangeError naming the function for numeric strings and null', () => {
  for (const bad of ['200', '1', '', null]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, JSON.stringify(bad));
      assert.ok(err.message.startsWith('readingTimeMinutes:'), JSON.stringify(bad));
      return true;
    });
  }
});

test('throws a RangeError naming the function for other non-number wpm values', () => {
  for (const bad of [true, false, {}, [], [200], () => 200, 10n, Symbol('wpm')]) {
    assert.throws(() => readingTimeMinutes('a b c', bad), (err) => {
      assert.ok(err instanceof RangeError, typeof bad);
      assert.ok(err.message.startsWith('readingTimeMinutes:'), typeof bad);
      return true;
    });
  }
});

test('validates the rate even when the text is empty', () => {
  assert.throws(() => readingTimeMinutes('', 0), RangeError);
});

test('checks the text before the rate', () => {
  for (const [text, wpm] of [[12, 0], [null, NaN], [undefined, -1], [{}, '200']]) {
    assert.throws(() => readingTimeMinutes(text, wpm), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('readingTimeMinutes:'));
      return true;
    });
  }
});

test('counts hyphenated compounds as one word', () => {
  const text = 'well-known ' + words(199); // 200 words, but 201 if the compound split
  assert.equal(wordCount(text), 200);
  assert.equal(readingTimeMinutes(text), 1);
  assert.equal(readingTimeMinutes('state-of-the-art', 1), 1);
});

test('counts contractions as one word', () => {
  assert.equal(readingTimeMinutes("don't can't won't", 1), 3);
  assert.equal(readingTimeMinutes("don’t " + words(199)), 1);
});

test('counts decimals as separate runs the way wordCount does', () => {
  const text = 'pi is 3.14 today';
  const n = wordCount(text);
  assert.equal(readingTimeMinutes(text, 1), n);
  assert.equal(readingTimeMinutes(text, n), 1);
  assert.equal(readingTimeMinutes(text, n - 0.5), 2);
});

test('agrees with wordCount on a mixed sample at several rates', () => {
  const text = "A well-known fact: it's 3.14, isn't it? Yes -- the e-mail arrived.";
  const n = wordCount(text);
  for (const wpm of [1, 2, 3, 5, 7, 200, 150.5]) {
    assert.equal(readingTimeMinutes(text, wpm), Math.ceil(n / wpm), String(wpm));
  }
});
