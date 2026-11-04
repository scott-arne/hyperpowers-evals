const { test } = require('node:test');
const assert = require('node:assert/strict');
const { topWords } = require('../src/textstats');

// Counted by hand: "keeper" x3, "lamp" x3, "night" x2, "tower" x2, and seven
// words once each (lit, old, older, storm, shook, climbed, hand). Ties sort
// alphabetically, so the top five are keeper, lamp, night, tower, climbed.
// Stop words (the, a, of, and, on, in, was) are present on purpose and must
// not appear.
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

test('ranks the words of a passage by count, then alphabetically', () => {
  assert.deepEqual(topWords(PASSAGE, 5), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
    { word: 'climbed', count: 1 },
  ]);
});

test('leaves every stop word of the passage out of the ranking', () => {
  const words = topWords(PASSAGE, 100).map((entry) => entry.word);
  for (const stop of ['the', 'a', 'of', 'and', 'on', 'in', 'was']) {
    assert.ok(!words.includes(stop), stop);
  }
});

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1]) {
    assert.throws(() => topWords('apple banana', bad), (err) => {
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

test('counts words that differ only in case as one entry', () => {
  assert.deepEqual(topWords('Éclair éclair', 5), [{ word: 'éclair', count: 2 }]);
});

test('counts typographic and straight apostrophes as one entry', () => {
  assert.deepEqual(topWords('keeper’s keeper\'s', 5), [{ word: 'keeper\'s', count: 2 }]);
});

test('returns every distinct word when n exceeds their number', () => {
  assert.deepEqual(topWords('apple banana apple', 10), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});

test('returns fresh objects on every call', () => {
  const first = topWords('apple banana apple', 2);
  first[0].count = 99;
  first[0].word = 'changed';
  first.pop();
  assert.deepEqual(topWords('apple banana apple', 2), [
    { word: 'apple', count: 2 },
    { word: 'banana', count: 1 },
  ]);
});
