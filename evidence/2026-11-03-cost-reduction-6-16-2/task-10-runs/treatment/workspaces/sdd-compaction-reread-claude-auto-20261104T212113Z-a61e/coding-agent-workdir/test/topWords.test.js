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

test('ranks the passage by hand-counted frequency without stop words', () => {
  assert.deepEqual(topWords(PASSAGE, 5), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
    { word: 'climbed', count: 1 },
  ]);
  const all = topWords(PASSAGE, 100).map((e) => e.word);
  assert.deepEqual(all, [
    'keeper', 'lamp', 'night', 'tower',
    'climbed', 'hand', 'lit', 'old', 'older', 'shook', 'storm',
  ]);
  for (const stop of ['the', 'a', 'of', 'and', 'on', 'in', 'was']) {
    assert.ok(!all.includes(stop), stop);
  }
});

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1, Infinity, null]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('topWords:'));
      return true;
    }, String(bad));
  }
});

test('checks the text before n', () => {
  assert.throws(() => topWords(5, -1), TypeError);
});

test('returns every distinct word when n exceeds their number', () => {
  assert.equal(topWords('apple banana cherry', 1000).length, 3);
});

test('folds case, including non-ASCII letters', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR Apple apple', 5), [
    { word: 'éclair', count: 3 },
    { word: 'apple', count: 2 },
  ]);
});

test('folds the typographic apostrophe to the straight one', () => {
  assert.deepEqual(topWords("keeper’s keeper's", 5), [{ word: "keeper's", count: 2 }]);
});

test('keeps hyphenated compounds, contractions and numbers whole', () => {
  assert.deepEqual(topWords("well-known well-known don't 42 42", 5), [
    { word: '42', count: 2 },
    { word: 'well-known', count: 2 },
    { word: "don't", count: 1 },
  ]);
});

test('skips stop words after case folding', () => {
  assert.deepEqual(topWords('The THE It apple', 5), [{ word: 'apple', count: 1 }]);
});

test('breaks ties in code-unit order, not locale order', () => {
  assert.deepEqual(topWords('c b', 5).map((e) => e.word), ['b', 'c']);
  assert.deepEqual(topWords('zebra Zulu apple', 5).map((e) => e.word), ['apple', 'zebra', 'zulu']);
  assert.deepEqual(topWords('ab é z', 5).map((e) => e.word), ['ab', 'z', 'é']);
});

test('returns fresh objects that can be mutated safely', () => {
  const first = topWords('apple apple pear', 2);
  first[0].count = 99;
  first.pop();
  assert.deepEqual(topWords('apple apple pear', 2), [
    { word: 'apple', count: 2 },
    { word: 'pear', count: 1 },
  ]);
});

test('does not modify its input', () => {
  const text = 'apple Apple';
  topWords(text, 1);
  assert.equal(text, 'apple Apple');
});
