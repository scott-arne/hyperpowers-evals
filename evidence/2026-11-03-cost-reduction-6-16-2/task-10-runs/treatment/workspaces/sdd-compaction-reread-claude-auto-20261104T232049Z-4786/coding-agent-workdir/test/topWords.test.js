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

test('ranks the top five words of the passage', () => {
  assert.deepEqual(topWords(PASSAGE, 5), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
    { word: 'climbed', count: 1 },
  ]);
});

test('lists every non-stop word of the passage in tie-break order', () => {
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

test('throws a RangeError naming the function for an out-of-range n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1, Infinity, null]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('topWords:'));
      return true;
    });
  }
});

test('checks the text before n', () => {
  assert.throws(() => topWords(5, -1), TypeError);
});

test('folds case so that differently cased words share one entry', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR Apple', 5), [
    { word: 'éclair', count: 3 },
    { word: 'apple', count: 1 },
  ]);
});

test('folds the typographic apostrophe so that both spellings share one entry', () => {
  assert.deepEqual(topWords("keeper’s keeper's", 5), [{ word: "keeper's", count: 2 }]);
});

test('skips stop words after case folding', () => {
  assert.deepEqual(topWords('The THE It Apple', 5), [{ word: 'apple', count: 1 }]);
});

test('skips all 36 listed stop words', () => {
  const stops = [
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'had', 'has',
    'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
    'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'were',
    'will', 'with',
  ];
  assert.equal(stops.length, 36);
  assert.deepEqual(topWords(stops.join(' '), 100), []);
});

test('keeps hyphenated compounds and numbers as words', () => {
  assert.deepEqual(topWords('well-known 42 well-known 42 well', 5), [
    { word: '42', count: 2 },
    { word: 'well-known', count: 2 },
    { word: 'well', count: 1 },
  ]);
});

test('breaks ties by code-unit order rather than locale order', () => {
  assert.deepEqual(topWords('zebra éclair', 2), [
    { word: 'zebra', count: 1 },
    { word: 'éclair', count: 1 },
  ]);
});

test('returns every distinct word when n exceeds their number', () => {
  assert.equal(topWords('apple banana', 1000).length, 2);
});

test('returns fresh objects so that mutating a result does not affect a later call', () => {
  const first = topWords('apple apple banana', 2);
  first[0].count = 99;
  first[1].word = 'changed';
  first.pop();
  assert.deepEqual(topWords('apple apple banana', 2), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});
