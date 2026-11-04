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

test('ranks the passage by count and then alphabetically, without stop words', () => {
  // Hand count: the single-count words are climbed, hand, lit, old, older,
  // shook and storm, so storm comes last among them, not fifth overall.
  assert.deepEqual(topWords(PASSAGE, 100), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
    { word: 'climbed', count: 1 },
    { word: 'hand', count: 1 },
    { word: 'lit', count: 1 },
    { word: 'old', count: 1 },
    { word: 'older', count: 1 },
    { word: 'shook', count: 1 },
    { word: 'storm', count: 1 },
  ]);
});

test('returns the four most frequent passage words when n is 4', () => {
  assert.deepEqual(topWords(PASSAGE, 4), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
  ]);
});

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1, Infinity, null]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('topWords:'));
      return true;
    });
  }
});

test('checks the text before n', () => {
  assert.throws(() => topWords(undefined, -1), TypeError);
});

test('returns every distinct word when n exceeds the number of words', () => {
  assert.deepEqual(topWords('apple apple banana', 1000), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});

test('folds case so differently cased words are one entry', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR Apple apple', 5), [
    { word: 'éclair', count: 3 },
    { word: 'apple', count: 2 },
  ]);
});

test('folds the typographic apostrophe into the straight one', () => {
  assert.deepEqual(topWords("keeper’s keeper's KEEPER’S", 5), [
    { word: "keeper's", count: 3 },
  ]);
});

test('skips stop words after case folding', () => {
  assert.deepEqual(topWords('The THE tHe Of lamp', 5), [{ word: 'lamp', count: 1 }]);
});

test('keeps hyphenated compounds and numbers as words', () => {
  assert.deepEqual(topWords('well-known 42 well-known 42 well', 5), [
    { word: '42', count: 2 },
    { word: 'well-known', count: 2 },
    { word: 'well', count: 1 },
  ]);
});

test('breaks ties by code-unit order rather than locale order', () => {
  // Code-unit order: "10" < "9" < "zeta" < "éclair".
  assert.deepEqual(topWords('éclair zeta 9 10', 5), [
    { word: '10', count: 1 },
    { word: '9', count: 1 },
    { word: 'zeta', count: 1 },
    { word: 'éclair', count: 1 },
  ]);
});

test('breaks ties alphabetically whatever the input order', () => {
  assert.deepEqual(topWords('cherry apple banana', 2), [
    { word: 'apple', count: 1 },
    { word: 'banana', count: 1 },
  ]);
});

test('returns fresh objects and arrays on every call', () => {
  const first = topWords('apple apple banana', 5);
  first[0].word = 'mutated';
  first[0].count = 99;
  first.pop();
  assert.deepEqual(topWords('apple apple banana', 5), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});
