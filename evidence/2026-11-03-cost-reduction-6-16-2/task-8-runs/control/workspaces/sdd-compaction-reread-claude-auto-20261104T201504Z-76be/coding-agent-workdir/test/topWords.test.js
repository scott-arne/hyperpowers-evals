const { test } = require('node:test');
const assert = require('node:assert/strict');
const { topWords } = require('../src/textstats');

// Counted by hand: "keeper" x3, "lamp" x3, "night" x2, "tower" x2, then seven
// words once each in code-unit order: climbed, hand, lit, old, older, shook,
// storm. Stop words (the, a, of, and, on, in, was) are present on purpose and
// must not appear.
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

test('ranks the passage by count, then by code unit within a count', () => {
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

test('leaves the passage stop words out of the full result', () => {
  const words = topWords(PASSAGE, 100).map((entry) => entry.word);
  for (const stop of ['the', 'a', 'of', 'and', 'on', 'in', 'was']) {
    assert.ok(!words.includes(stop), stop);
  }
});

test('folds case with toLowerCase, including accented letters', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR Apple', 5), [
    { word: 'éclair', count: 3 },
    { word: 'apple', count: 1 },
  ]);
});

test('folds the typographic apostrophe into the straight one', () => {
  assert.deepEqual(topWords("keeper’s keeper's", 5), [{ word: "keeper's", count: 2 }]);
});

test('keeps hyphenated compounds, contractions and numbers as words', () => {
  assert.deepEqual(topWords("well-known don't 42 well-known", 5), [
    { word: 'well-known', count: 2 },
    { word: '42', count: 1 },
    { word: "don't", count: 1 },
  ]);
});

test('skips stop words after folding', () => {
  assert.deepEqual(topWords('The THE the Apple', 5), [{ word: 'apple', count: 1 }]);
});

test('breaks ties by code unit, not by locale', () => {
  // Code-unit order puts "z" before "é"; a locale comparison would not.
  assert.deepEqual(topWords('é z e', 5), [
    { word: 'e', count: 1 },
    { word: 'z', count: 1 },
    { word: 'é', count: 1 },
  ]);
});

test('returns every distinct word when n is larger than their number', () => {
  assert.deepEqual(topWords('pear apple apple', 99), [
    { word: 'apple', count: 2 },
    { word: 'pear', count: 1 },
  ]);
});

test('throws a RangeError naming the function for an invalid n', () => {
  for (const bad of [undefined, NaN, '3', 1.5, -1]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('topWords:'));
      return true;
    });
  }
});

test('checks the text before n', () => {
  assert.throws(() => topWords(5, 'bad'), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('topWords:'));
    return true;
  });
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

test('skips every one of the 36 stop words listed in the plan', () => {
  const planStopWords = [
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'had', 'has',
    'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
    'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'were',
    'will', 'with',
  ];
  assert.equal(planStopWords.length, 36);
  for (const word of planStopWords) {
    assert.deepEqual(topWords(word, 5), [], `stop word "${word}" was not skipped`);
  }
});
