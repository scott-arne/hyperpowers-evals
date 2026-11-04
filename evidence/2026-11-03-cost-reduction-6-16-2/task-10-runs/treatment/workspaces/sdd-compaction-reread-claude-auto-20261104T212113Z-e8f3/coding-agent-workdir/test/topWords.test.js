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

test('ranks the passage by count and then alphabetically, skipping stop words', () => {
  // Hand-counted: keeper 3, lamp 3, night 2, tower 2. The remaining content
  // words (climbed, hand, lit, old, older, shook, storm) occur once each.
  assert.deepEqual(topWords(PASSAGE, 4), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
  ]);
});

test('lists every distinct content word of the passage when n is large', () => {
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

test('never lists the stop words that occur in the passage', () => {
  const words = topWords(PASSAGE, 100).map((entry) => entry.word);
  for (const stop of ['the', 'a', 'of', 'and', 'on', 'in', 'was']) {
    assert.ok(!words.includes(stop), stop);
  }
});

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1, Infinity, null]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('topWords:'), String(bad));
      return true;
    });
  }
});

test('checks the text before n', () => {
  assert.throws(() => topWords(3, -1), TypeError);
});

test('returns every distinct word when n exceeds their number', () => {
  assert.deepEqual(topWords('apple pear', 1000), [
    { word: 'apple', count: 1 },
    { word: 'pear', count: 1 },
  ]);
});

test('folds upper and lower case into one entry', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR Apple', 5), [
    { word: 'éclair', count: 3 },
    { word: 'apple', count: 1 },
  ]);
});

test('skips stop words regardless of case', () => {
  assert.deepEqual(topWords('The THE Of apple', 5), [{ word: 'apple', count: 1 }]);
});

test('folds the typographic apostrophe into the straight one', () => {
  assert.deepEqual(topWords("keeper’s keeper's", 5), [{ word: "keeper's", count: 2 }]);
});

test('keeps hyphenated compounds and contractions whole and counts numbers', () => {
  assert.deepEqual(topWords("well-known don't well-known 42 42 42", 5), [
    { word: '42', count: 3 },
    { word: 'well-known', count: 2 },
    { word: "don't", count: 1 },
  ]);
});

test('breaks ties in code-unit order rather than locale order', () => {
  // A non-ASCII word sorts after every ASCII word by code unit; localeCompare
  // would place "éclair" between "apple" and "zebra".
  assert.deepEqual(topWords('éclair zebra apple', 3), [
    { word: 'apple', count: 1 },
    { word: 'zebra', count: 1 },
    { word: 'éclair', count: 1 },
  ]);
});

test('returns fresh objects on every call', () => {
  const first = topWords('apple apple pear', 2);
  first[0].count = 99;
  first[1].word = 'changed';
  first.pop();
  assert.deepEqual(topWords('apple apple pear', 2), [
    { word: 'apple', count: 2 },
    { word: 'pear', count: 1 },
  ]);
});
