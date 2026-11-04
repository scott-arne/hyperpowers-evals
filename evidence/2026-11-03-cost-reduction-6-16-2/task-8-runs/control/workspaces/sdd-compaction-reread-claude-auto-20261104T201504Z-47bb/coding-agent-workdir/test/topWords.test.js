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

test('ranks the passage with ties broken alphabetically and stop words removed', () => {
  assert.deepEqual(topWords(PASSAGE, 4), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
  ]);
});

test('lists every distinct passage word when n is large, once-only words last', () => {
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

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [-1, 1.5, NaN, Infinity, -Infinity, '3', undefined, null]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('topWords:'), String(bad));
      return true;
    });
  }
});

test('checks the text before n', () => {
  assert.throws(() => topWords(5, -1), TypeError);
});

test('returns every distinct word when n exceeds their number', () => {
  assert.deepEqual(topWords('pear apple pear', 10), [
    { word: 'pear', count: 2 },
    { word: 'apple', count: 1 },
  ]);
});

test('folds case, including non-ASCII letters', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR Apple apple', 5), [
    { word: 'éclair', count: 3 },
    { word: 'apple', count: 2 },
  ]);
});

test('folds the typographic apostrophe into the straight one', () => {
  assert.deepEqual(topWords('keeper’s keeper\'s Keeper’s', 5), [
    { word: "keeper's", count: 3 },
  ]);
});

test('keeps contractions and hyphenated compounds whole', () => {
  assert.deepEqual(topWords("don't well-known don't", 5), [
    { word: "don't", count: 2 },
    { word: 'well-known', count: 1 },
  ]);
});

test('counts numbers as words', () => {
  assert.deepEqual(topWords('42 42 apple', 5), [
    { word: '42', count: 2 },
    { word: 'apple', count: 1 },
  ]);
});

test('skips stop words in any case', () => {
  assert.deepEqual(topWords('The THE the Apple', 5), [{ word: 'apple', count: 1 }]);
});

test('skips all 36 stop words', () => {
  const stop = ('a an and are as at be by for from had has have he her his i in is it its of on or ' +
    'she that the their there they this to was were will with').split(' ');
  assert.equal(stop.length, 36);
  assert.deepEqual(topWords(stop.join(' ') + ' zebra', 100), [{ word: 'zebra', count: 1 }]);
});

test('breaks ties by code unit, so upper-case-folded and accented words sort after plain ones', () => {
  assert.deepEqual(topWords('zebra éclair apple mango', 4).map((e) => e.word), [
    'apple', 'mango', 'zebra', 'éclair',
  ]);
});

test('returns fresh objects and arrays on every call', () => {
  const first = topWords('apple apple pear', 2);
  first[0].count = 99;
  first.pop();
  const second = topWords('apple apple pear', 2);
  assert.deepEqual(second, [
    { word: 'apple', count: 2 },
    { word: 'pear', count: 1 },
  ]);
  assert.notEqual(first, second);
  assert.notEqual(first[0], second[0]);
});
