const { test } = require('node:test');
const assert = require('node:assert/strict');
const { topWords } = require('../src/textstats');

// Top five of this passage: "keeper" x3, "lamp" x3, "night" x2, "tower" x2,
// then "climbed" x1. Several words tie at count 1 (climbed, hand, lit, old,
// older, shook, storm) and "climbed" wins the code-unit tiebreak. Stop words
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

test('ranks the passage with keeper, lamp, night, tower and climbed on top', () => {
  assert.deepEqual(topWords(PASSAGE, 5), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
    { word: 'climbed', count: 1 },
  ]);
});

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('topWords:'), String(bad));
      return true;
    });
  }
});

test('folds case so differently cased words are one entry', () => {
  assert.deepEqual(topWords('Apple apple APPLE', 5), [{ word: 'apple', count: 3 }]);
  assert.deepEqual(topWords('Éclair éclair', 5), [{ word: 'éclair', count: 2 }]);
});

test('folds the typographic apostrophe into the straight one', () => {
  assert.deepEqual(topWords('keeper’s keeper\'s', 5), [{ word: "keeper's", count: 2 }]);
});

test('excludes stop words even when they are the most frequent words', () => {
  assert.deepEqual(topWords('the the the the of of of apple', 5), [{ word: 'apple', count: 1 }]);
});

test('returns fresh objects on every call', () => {
  const first = topWords('apple apple', 1);
  first[0].count = 99;
  first[0].word = 'changed';
  first.push({ word: 'extra', count: 1 });
  assert.deepEqual(topWords('apple apple', 1), [{ word: 'apple', count: 2 }]);
});

test('breaks ties by code unit order, not locale order', () => {
  // localeCompare would put "éclair" before "zebra"; by code unit "é" (U+00E9) sorts after "z".
  assert.deepEqual(topWords('éclair zebra', 2), [
    { word: 'zebra', count: 1 },
    { word: 'éclair', count: 1 },
  ]);
});
