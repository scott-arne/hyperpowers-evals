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

const STOP_WORDS = [
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'had', 'has',
  'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
  'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'were',
  'will', 'with',
];

test('ranks the top four words of the passage by count then alphabet', () => {
  assert.deepEqual(topWords(PASSAGE, 4), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
  ]);
});

test('includes storm with a count of 1 in the full ranking of the passage', () => {
  assert.ok(topWords(PASSAGE, 1000).some((e) => e.word === 'storm' && e.count === 1));
  assert.deepEqual(topWords(PASSAGE, 1000).find((e) => e.word === 'storm'), { word: 'storm', count: 1 });
});

test('leaves every stop word of the passage out of the full ranking', () => {
  const words = topWords(PASSAGE, 1000).map((e) => e.word);
  for (const stop of ['the', 'a', 'of', 'and', 'on', 'in', 'was']) {
    assert.ok(!words.includes(stop), stop);
  }
  assert.equal(words.length, 11);
});

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1, Infinity, null]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError, String(bad));
      assert.ok(err.message.startsWith('topWords:'));
      return true;
    });
  }
});

test('checks the text before n', () => {
  assert.throws(() => topWords(3, NaN), TypeError);
  assert.throws(() => topWords(undefined, undefined), TypeError);
});

test('folds case so that Éclair and éclair are one entry', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR', 5), [{ word: 'éclair', count: 3 }]);
});

test('folds typographic apostrophes into the straight apostrophe', () => {
  assert.deepEqual(topWords('keeper\u2019s keeper\'s Keeper\u2019s', 5), [{ word: "keeper's", count: 3 }]);
});

test('returns every distinct word when n is larger than the distinct count', () => {
  assert.deepEqual(topWords('pear apple apple', 100), [
    { word: 'apple', count: 2 },
    { word: 'pear', count: 1 },
  ]);
});

test('keeps hyphenated compounds and contractions whole', () => {
  assert.deepEqual(topWords("well-known don't well-known", 5), [
    { word: 'well-known', count: 2 },
    { word: "don't", count: 1 },
  ]);
});

test('counts numbers as words', () => {
  assert.deepEqual(topWords('42 42 apple', 5), [
    { word: '42', count: 2 },
    { word: 'apple', count: 1 },
  ]);
});

test('breaks ties in code-unit order, with digits before letters', () => {
  assert.deepEqual(topWords('apple 2 10', 5), [
    { word: '10', count: 1 },
    { word: '2', count: 1 },
    { word: 'apple', count: 1 },
  ]);
});

test('breaks ties in code-unit order, with accented letters after ASCII ones', () => {
  assert.deepEqual(topWords('\u00e9clair zebra', 5), [
    { word: 'zebra', count: 1 },
    { word: '\u00e9clair', count: 1 },
  ]);
});

test('skips each of the 36 stop words', () => {
  assert.equal(STOP_WORDS.length, 36);
  assert.deepEqual(topWords(STOP_WORDS.join(' '), 100), []);
  for (const stop of STOP_WORDS) {
    assert.deepEqual(topWords(stop, 5), [], stop);
  }
});

test('skips stop words after case folding', () => {
  assert.deepEqual(topWords('The THE With', 5), []);
});

test('keeps words that only resemble a stop word', () => {
  const near = ['these', 'theirs', 'then', 'ant', 'it\'s', 'with-out', 'ass'];
  assert.deepEqual(topWords(near.join(' '), 100).map((e) => e.word), [
    'ant', 'ass', "it's", 'theirs', 'then', 'these', 'with-out',
  ]);
});

test('returns fresh objects on every call', () => {
  const first = topWords('apple apple pear', 5);
  first[0].count = 99;
  first.push({ word: 'junk', count: 1 });
  assert.deepEqual(topWords('apple apple pear', 5), [
    { word: 'apple', count: 2 },
    { word: 'pear', count: 1 },
  ]);
});
