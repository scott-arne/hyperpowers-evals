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

const STOP_WORDS = [
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'had', 'has',
  'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
  'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'were',
  'will', 'with',
];

const words = (result) => result.map((entry) => entry.word);

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

test('ranks the passage, skipping stop words and breaking ties alphabetically', () => {
  const all = topWords(PASSAGE, 100);
  assert.deepEqual(all.slice(0, 5), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
    { word: 'climbed', count: 1 },
  ]);
  for (const stop of ['the', 'a', 'of', 'and', 'on', 'in', 'was']) {
    assert.ok(!words(all).includes(stop), stop);
  }
});

test('truncates the passage ranking to n entries', () => {
  assert.deepEqual(topWords(PASSAGE, 2), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
  ]);
});

test('returns every distinct word when n exceeds their number', () => {
  assert.equal(topWords('apple banana cherry', 1000).length, 3);
});

test('skips every one of the 36 stop words', () => {
  assert.equal(STOP_WORDS.length, 36);
  assert.deepEqual(topWords(STOP_WORDS.join(' '), 100), []);
});

test('skips stop words regardless of case', () => {
  assert.deepEqual(topWords('The THE tHe apple', 5), [{ word: 'apple', count: 1 }]);
});

test('does not skip words that merely contain a stop word', () => {
  assert.deepEqual(words(topWords('theme island other', 5)), ['island', 'other', 'theme']);
});

test('lower-cases words so differing case is one entry', () => {
  assert.deepEqual(topWords('Apple APPLE apple', 5), [{ word: 'apple', count: 3 }]);
});

test('lower-cases non-ASCII letters', () => {
  assert.deepEqual(topWords('Éclair éclair', 5), [{ word: 'éclair', count: 2 }]);
});

test('folds the typographic apostrophe into the straight one', () => {
  assert.deepEqual(topWords("keeper’s keeper's", 5), [{ word: "keeper's", count: 2 }]);
});

test('keeps hyphenated compounds whole', () => {
  assert.deepEqual(topWords('well-known well-known', 5), [{ word: 'well-known', count: 2 }]);
});

test('keeps contractions whole', () => {
  assert.deepEqual(topWords("don't don't", 5), [{ word: "don't", count: 2 }]);
});

test('treats numbers as words', () => {
  assert.deepEqual(topWords('42 42 7', 5), [
    { word: '42', count: 2 },
    { word: '7', count: 1 },
  ]);
});

test('drops stray leading and trailing apostrophes and hyphens from returned words', () => {
  assert.deepEqual(topWords("'dogs' -well- cats-", 10), [
    { word: 'cats', count: 1 },
    { word: 'dogs', count: 1 },
    { word: 'well', count: 1 },
  ]);
});

test('splits a doubled joiner into two words', () => {
  assert.deepEqual(topWords('x--y', 5), [
    { word: 'x', count: 1 },
    { word: 'y', count: 1 },
  ]);
  assert.deepEqual(topWords("x''y", 5), [
    { word: 'x', count: 1 },
    { word: 'y', count: 1 },
  ]);
});

test('breaks ties in code-unit order, not locale order', () => {
  // "é" (U+00E9) sorts after "z" by code unit; localeCompare would put it first.
  assert.deepEqual(words(topWords('zebra éclair apple', 3)), ['apple', 'zebra', 'éclair']);
  // Digits sort before letters.
  assert.deepEqual(words(topWords('b 2 c', 3)), ['2', 'b', 'c']);
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
  assert.throws(() => topWords(5, 'bad'), TypeError);
});

test('returns fresh objects on every call', () => {
  const first = topWords('apple apple', 1);
  first[0].count = 99;
  first.push({ word: 'junk', count: 1 });
  assert.deepEqual(topWords('apple apple', 1), [{ word: 'apple', count: 2 }]);
});
