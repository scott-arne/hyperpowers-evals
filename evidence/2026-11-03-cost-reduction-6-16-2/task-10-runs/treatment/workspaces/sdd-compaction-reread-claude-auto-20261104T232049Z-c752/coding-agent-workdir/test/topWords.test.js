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

test('ranks the passage by count then alphabet and skips stop words', () => {
  assert.deepEqual(topWords(PASSAGE, 4), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
  ]);
  const stop = ['the', 'a', 'of', 'and', 'on', 'in', 'was'];
  const words = topWords(PASSAGE, 100).map((entry) => entry.word);
  for (const s of stop) {
    assert.ok(!words.includes(s), s);
  }
  assert.equal(words.length, 11);
});

test('throws a RangeError naming the function for a bad n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('topWords:'), String(bad));
      return true;
    });
  }
});

test('checks the text before n', () => {
  assert.throws(() => topWords(42, -1), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('topWords:'));
    return true;
  });
});

test('folds upper case so Éclair and éclair are one word', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR', 5), [{ word: 'éclair', count: 3 }]);
});

test('folds the typographic apostrophe so keeper’s and keeper\'s are one word', () => {
  assert.deepEqual(topWords('keeper’s keeper\'s', 5), [{ word: "keeper's", count: 2 }]);
});

test('skips stop words after case folding', () => {
  assert.deepEqual(topWords('The THE It apple', 5), [{ word: 'apple', count: 1 }]);
});

test('returns every distinct word when n exceeds their number', () => {
  assert.deepEqual(topWords('apple banana apple', 100), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});

test('keeps hyphenated compounds and numbers as words', () => {
  assert.deepEqual(topWords('well-known 42 well-known', 5), [
    { word: 'well-known', count: 2 },
    { word: '42', count: 1 },
  ]);
});

test('breaks ties in code-unit order, not locale order', () => {
  assert.deepEqual(topWords('y x Y X', 5), [
    { word: 'x', count: 2 },
    { word: 'y', count: 2 },
  ]);
  assert.deepEqual(topWords('zebra apple', 5).map((e) => e.word), ['apple', 'zebra']);
  assert.deepEqual(topWords('éa za', 5).map((e) => e.word), ['za', 'éa']);
});

test('returns fresh objects on every call', () => {
  const first = topWords('apple apple banana', 2);
  const second = topWords('apple apple banana', 2);
  assert.notEqual(first, second);
  assert.notEqual(first[0], second[0]);
  first[0].count = 99;
  first.pop();
  assert.deepEqual(topWords('apple apple banana', 2), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});
