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

// ---- Added tests: behaviour stated in the brief's prose ----

test('passage: ranks by count, then alphabetically within ties', () => {
  // Count-1 words in alphabetical order: climbed, hand, lit, old, older,
  // shook, storm. With n = 6 the cut falls after "hand", so "storm" is out.
  assert.deepEqual(topWords(PASSAGE, 6), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
    { word: 'climbed', count: 1 },
    { word: 'hand', count: 1 },
  ]);
});

test('passage: full ranking contains every non-stop word and no stop word', () => {
  const full = topWords(PASSAGE, 100);
  assert.deepEqual(full, [
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
  const words = full.map((e) => e.word);
  for (const stop of ['the', 'a', 'of', 'and', 'on', 'in', 'was']) {
    assert.ok(!words.includes(stop), stop);
  }
});

test('folds case so accented and plain words are one entry', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR', 5), [{ word: 'éclair', count: 3 }]);
  assert.deepEqual(topWords('Apple APPLE apple', 5), [{ word: 'apple', count: 3 }]);
});

test('folds stop words after lower-casing', () => {
  assert.deepEqual(topWords('The THE And OF', 5), []);
});

test('folds the typographic apostrophe to the straight one', () => {
  assert.deepEqual(topWords('keeper’s keeper\'s', 5), [{ word: "keeper's", count: 2 }]);
  assert.deepEqual(topWords('keeper\'s keeper’s', 5), [{ word: "keeper's", count: 2 }]);
  assert.deepEqual(topWords('keeper’s', 5), [{ word: "keeper's", count: 1 }]);
});

test('keeps hyphenated compounds, contractions and numbers whole', () => {
  assert.deepEqual(topWords('well-known well-known', 5), [{ word: 'well-known', count: 2 }]);
  assert.deepEqual(topWords("don't Don’t", 5), [{ word: "don't", count: 2 }]);
  assert.deepEqual(topWords('42 42 7', 5), [
    { word: '42', count: 2 },
    { word: '7', count: 1 },
  ]);
});

test('a stop word inside a compound or contraction is not skipped', () => {
  assert.deepEqual(topWords("it's the-end", 5), [
    { word: "it's", count: 1 },
    { word: 'the-end', count: 1 },
  ]);
});

test('breaks ties in code-unit order, not locale order', () => {
  // "é" (U+00E9) sorts after "z" in code units; a locale sort would put it first.
  assert.deepEqual(topWords('zebra éclair', 5), [
    { word: 'zebra', count: 1 },
    { word: 'éclair', count: 1 },
  ]);
  // Uppercase input is lower-cased before ordering.
  assert.deepEqual(topWords('Zebra Apple', 5), [
    { word: 'apple', count: 1 },
    { word: 'zebra', count: 1 },
  ]);
  // Digits sort before letters, and "10" before "9" as strings.
  assert.deepEqual(topWords('apple 9 10', 5), [
    { word: '10', count: 1 },
    { word: '9', count: 1 },
    { word: 'apple', count: 1 },
  ]);
});

test('returns every word when n exceeds the number of distinct words', () => {
  assert.deepEqual(topWords('apple banana apple', 100), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1, Infinity]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('topWords:'), String(bad));
      return true;
    });
  }
});

test('checks the text before n', () => {
  assert.throws(() => topWords(undefined, 'bad'), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('topWords:'));
    return true;
  });
});

test('returns fresh objects on every call', () => {
  const first = topWords('apple apple banana', 2);
  first[0].count = 99;
  first[0].word = 'changed';
  first.pop();
  assert.deepEqual(topWords('apple apple banana', 2), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});
