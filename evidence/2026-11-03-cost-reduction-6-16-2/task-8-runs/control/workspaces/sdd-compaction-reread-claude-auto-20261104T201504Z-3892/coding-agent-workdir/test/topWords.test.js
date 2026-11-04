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

// Added tests, one per behaviour bullet in the brief.

test('ranks the words of the lighthouse passage by count, then alphabetically', () => {
  // Hand count after dropping stop words: keeper 3, lamp 3, night 2, tower 2,
  // and seven words once each (climbed, hand, lit, old, older, shook, storm).
  assert.deepEqual(topWords(PASSAGE, 4), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
  ]);
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

test('leaves the stop words of the lighthouse passage out of the ranking', () => {
  const words = topWords(PASSAGE, 100).map((entry) => entry.word);
  for (const stop of ['the', 'a', 'of', 'and', 'on', 'in', 'was']) {
    assert.ok(!words.includes(stop), stop);
  }
});

test('keeps hyphenated compounds and contractions whole and counts numbers', () => {
  assert.deepEqual(topWords("well-known 42 well-known 42 42 don't", 10), [
    { word: '42', count: 3 },
    { word: 'well-known', count: 2 },
    { word: "don't", count: 1 },
  ]);
});

test('folds case so capitalised and lower-case forms are one entry', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR Apple apple', 5), [
    { word: 'éclair', count: 3 },
    { word: 'apple', count: 2 },
  ]);
});

test('folds the typographic apostrophe to the straight one', () => {
  assert.deepEqual(topWords("keeper’s keeper's Keeper’s", 5), [
    { word: "keeper's", count: 3 },
  ]);
});

test('skips stop words after case folding', () => {
  assert.deepEqual(topWords('The THE This WITH Was apple', 5), [
    { word: 'apple', count: 1 },
  ]);
});

test('skips the first and last stop words of the list but not near misses', () => {
  assert.deepEqual(topWords('a with an and withal thee', 10), [
    { word: 'thee', count: 1 },
    { word: 'withal', count: 1 },
  ]);
});

test('does not treat a contraction of a stop word as a stop word', () => {
  assert.deepEqual(topWords("it's it", 5), [{ word: "it's", count: 1 }]);
});

test('breaks ties alphabetically', () => {
  assert.deepEqual(topWords('pear apple fig', 3), [
    { word: 'apple', count: 1 },
    { word: 'fig', count: 1 },
    { word: 'pear', count: 1 },
  ]);
});

test('breaks ties in code-unit order, not locale order', () => {
  // "z" (U+007A) sorts before "é" (U+00E9) by code unit; a locale sort would not.
  assert.deepEqual(topWords('égret zebra', 2), [
    { word: 'zebra', count: 1 },
    { word: 'égret', count: 1 },
  ]);
  // Digits (U+0030..) sort before letters, and "10" before "9" as strings.
  assert.deepEqual(topWords('b 9 10', 3), [
    { word: '10', count: 1 },
    { word: '9', count: 1 },
    { word: 'b', count: 1 },
  ]);
});

test('returns every entry when n exceeds the number of distinct words', () => {
  assert.deepEqual(topWords('apple banana apple', 10), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});

test('returns exactly n entries when n equals the number of distinct words', () => {
  assert.deepEqual(topWords('apple banana apple', 2), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
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

test('checks the text before n', () => {
  assert.throws(() => topWords(undefined, undefined), TypeError);
  assert.throws(() => topWords(3, -1), TypeError);
  assert.throws(() => topWords('apple', undefined), RangeError);
});

test('returns fresh objects on every call', () => {
  const first = topWords('apple', 1);
  first[0].count = 99;
  first.push({ word: 'junk', count: 1 });
  const second = topWords('apple', 1);
  assert.deepEqual(second, [{ word: 'apple', count: 1 }]);
  assert.notEqual(first[0], second[0]);
});
