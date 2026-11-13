const { test } = require('node:test');
const assert = require('node:assert/strict');
const { topWords } = require('../src/textstats');

// "keeper" x3, "lamp" x3, "night" x2, "tower" x2, "storm" x1. Stop words
// (the, a, of, and, on, in, was) are present on purpose and must not appear.
const PASSAGE = [
  'The keeper lit the lamp. The lamp was old, and the keeper was older.',
  'On a night of storm the tower shook; in the night the keeper climbed',
  'the tower, lamp in hand.',
].join(' ');

const CASES = [
  ["apple", 1, [{"word": "apple", "count": 1}]],
  ["apple apple", 1, [{"word": "apple", "count": 2}]],
  ["apple banana", 5, [{"word": "apple", "count": 1}, {"word": "banana", "count": 1}]],
  ["banana apple", 5, [{"word": "apple", "count": 1}, {"word": "banana", "count": 1}]],
  ["fig fig pear", 1, [{"word": "fig", "count": 2}]],
  ["fig fig pear", 2, [{"word": "fig", "count": 2}, {"word": "pear", "count": 1}]],
  ["kiwi kiwi lime lime", 2, [{"word": "kiwi", "count": 2}, {"word": "lime", "count": 2}]],
  ["x y z", 2, [{"word": "x", "count": 1}, {"word": "y", "count": 1}]],
];

test('returns an empty array for the empty string', () => {
  assert.deepEqual(topWords('', 5), []);
});

test('returns an empty array for punctuation and whitespace only', () => {
  assert.deepEqual(topWords(' ... -- ?! \n', 5), []);
});

test('returns an empty array when every word is a stop word', () => {
  assert.deepEqual(topWords('the and of the to a in it', 5), []);
});

test('returns an empty array when n is 0', () => {
  assert.deepEqual(topWords('apple banana apple', 0), []);
});

test('returns word and count pairs', () => {
  assert.deepEqual(topWords('apple', 1), [{ word: 'apple', count: 1 }]);
});

test('orders words by count, highest first', () => {
  assert.deepEqual(topWords('pear apple apple fig fig fig', 3), [
    { word: 'fig', count: 3 },
    { word: 'apple', count: 2 },
    { word: 'pear', count: 1 },
  ]);
});

test('throws a TypeError naming the function for a non-string', () => {
  for (const bad of [undefined, null, 3, {}, ['apple']]) {
    assert.throws(() => topWords(bad, 3), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('topWords:'));
      return true;
    });
  }
});

test('matches every row of the reference table', () => {
  for (const [text, n, expected] of CASES) {
    assert.deepEqual(topWords(text, n), expected, JSON.stringify([text, n]));
  }
});

// Added tests for behaviour the reference table leaves untested.

test('ranks the passage, skipping stop words and breaking ties alphabetically', () => {
  // Hand count (stop words skipped): keeper 3 (The keeper lit, the keeper was
  // older, the keeper climbed), lamp 3 (lit the lamp, The lamp was,
  // tower, lamp in hand), night 2, tower 2. Count-1 words, alphabetically:
  // climbed, hand, lit, old, older, shook, storm. Top 5 therefore ends with
  // "climbed", not "storm".
  assert.deepEqual(topWords(PASSAGE, 5), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
    { word: 'climbed', count: 1 },
  ]);
  assert.deepEqual(topWords(PASSAGE, 100).map((e) => e.word), [
    'keeper', 'lamp', 'night', 'tower',
    'climbed', 'hand', 'lit', 'old', 'older', 'shook', 'storm',
  ]);
});

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('topWords: n must be a non-negative integer, received'));
      return true;
    }, String(bad));
  }
});

test('validates the text before n', () => {
  assert.throws(() => topWords(3, -1), TypeError);
  assert.throws(() => topWords(undefined, undefined), TypeError);
});

test('folds case so Éclair and éclair are one word', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR', 5), [{ word: 'éclair', count: 3 }]);
});

test('folds typographic apostrophes so keeper’s and keeper\'s are one word', () => {
  assert.deepEqual(topWords('keeper’s keeper\'s', 5), [{ word: "keeper's", count: 2 }]);
});

test('counts hyphenated compounds, contractions and numbers as words', () => {
  assert.deepEqual(topWords('well-known well-known don\'t 42', 5), [
    { word: 'well-known', count: 2 },
    { word: '42', count: 1 },
    { word: 'don\'t', count: 1 },
  ]);
});

test('returns every distinct word when n exceeds their number', () => {
  assert.deepEqual(topWords('pear apple apple', 50), [
    { word: 'apple', count: 2 },
    { word: 'pear', count: 1 },
  ]);
});

test('returns fresh objects on every call', () => {
  const first = topWords('apple apple pear', 2);
  first[0].count = 99;
  first[0].word = 'changed';
  first.pop();
  assert.deepEqual(topWords('apple apple pear', 2), [
    { word: 'apple', count: 2 },
    { word: 'pear', count: 1 },
  ]);
});

test('does not mutate its arguments', () => {
  const text = 'Pear apple apple';
  const n = 2;
  topWords(text, n);
  assert.equal(text, 'Pear apple apple');
  assert.equal(n, 2);
});
