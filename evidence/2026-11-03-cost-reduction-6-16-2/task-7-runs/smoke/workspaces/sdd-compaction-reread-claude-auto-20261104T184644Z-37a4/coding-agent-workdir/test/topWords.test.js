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

// Reference table: every row below also appears in the plan's reference section.
const CASES = [
  ["apple", 1, [{"word": "apple", "count": 1}]],
  ["apple apple", 1, [{"word": "apple", "count": 2}]],
  ["apple banana", 5, [{"word": "apple", "count": 1}, {"word": "banana", "count": 1}]],
  ["banana apple", 5, [{"word": "apple", "count": 1}, {"word": "banana", "count": 1}]],
  ["fig fig pear", 1, [{"word": "fig", "count": 2}]],
  ["fig fig pear", 2, [{"word": "fig", "count": 2}, {"word": "pear", "count": 1}]],
  ["kiwi kiwi lime lime", 2, [{"word": "kiwi", "count": 2}, {"word": "lime", "count": 2}]],
  ["x y z", 2, [{"word": "x", "count": 1}, {"word": "y", "count": 1}]],
  ["Z y X", 3, [{"word": "x", "count": 1}, {"word": "y", "count": 1}, {"word": "z", "count": 1}]],
  ["the the the", 3, []],
  ["The cat", 3, [{"word": "cat", "count": 1}]],
  ["cat THE cat", 3, [{"word": "cat", "count": 2}]],
  ["cat, cat. cat!", 1, [{"word": "cat", "count": 3}]],
  ["cat-dog cat dog", 5, [{"word": "cat", "count": 1}, {"word": "cat-dog", "count": 1}, {"word": "dog", "count": 1}]],
  ["it's its", 5, [{"word": "it's", "count": 1}]],
  ["they're they", 5, [{"word": "they're", "count": 1}]],
  ["12 12 12 7", 2, [{"word": "12", "count": 3}, {"word": "7", "count": 1}]],
  ["2 10", 2, [{"word": "10", "count": 1}, {"word": "2", "count": 1}]],
  ["a1 A1 a1", 1, [{"word": "a1", "count": 3}]],
  ["Straße STRASSE", 5, [{"word": "strasse", "count": 1}, {"word": "straße", "count": 1}]],
  ["ÀB àb", 1, [{"word": "àb", "count": 2}]],
  ["日本 日本 語", 2, [{"word": "日本", "count": 2}, {"word": "語", "count": 1}]],
  ["ok ok ok no no yes", 3, [{"word": "ok", "count": 3}, {"word": "no", "count": 2}, {"word": "yes", "count": 1}]],
  ["ok ok ok no no yes", 2, [{"word": "ok", "count": 3}, {"word": "no", "count": 2}]],
  ["ok ok ok no no yes", 1, [{"word": "ok", "count": 3}]],
  ["one two two three three three", 3, [{"word": "three", "count": 3}, {"word": "two", "count": 2}, {"word": "one", "count": 1}]],
  ["is are was were be", 5, []],
  ["i he she they it", 5, []],
  ["with from by for at as", 5, []],
  ["will have has had are", 5, []],
  ["this that there their its", 5, []],
  ["fox, fox; fox: fox", 2, [{"word": "fox", "count": 4}]],
  ["(fox) [fox] {fox}", 2, [{"word": "fox", "count": 3}]],
  ["\"fox\" 'fox'", 2, [{"word": "fox", "count": 2}]],
  ["fox\nfox\tfox  fox", 1, [{"word": "fox", "count": 4}]],
  ["fox—fox", 1, [{"word": "fox", "count": 2}]],
  ["fox/fox", 1, [{"word": "fox", "count": 2}]],
  ["fox_fox", 1, [{"word": "fox", "count": 2}]],
  ["fox fox", 0, []],
  ["", 0, []],
  ["   ", 3, []],
  ["pear", 100, [{"word": "pear", "count": 1}]],
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

test('breaks ties alphabetically', () => {
  assert.deepEqual(topWords('mango kiwi apple kiwi mango apple', 3), [
    { word: 'apple', count: 2 },
    { word: 'kiwi', count: 2 },
    { word: 'mango', count: 2 },
  ]);
});

test('returns at most n entries', () => {
  assert.equal(topWords('a1 b2 c3 d4 e5 f6 g7', 3).length, 3);
});

test('returns every distinct word when n exceeds their number', () => {
  assert.deepEqual(topWords('cedar birch cedar', 10), [
    { word: 'cedar', count: 2 },
    { word: 'birch', count: 1 },
  ]);
});

test('folds case before counting', () => {
  assert.deepEqual(topWords('Apple APPLE apple', 1), [{ word: 'apple', count: 3 }]);
});

test('folds non-ASCII case before counting', () => {
  assert.deepEqual(topWords('Éclair éclair ÉCLAIR', 1), [{ word: 'éclair', count: 3 }]);
});

test('skips stop words regardless of case', () => {
  assert.deepEqual(topWords('The THE the Heron', 5), [{ word: 'heron', count: 1 }]);
});

test('treats typographic and straight apostrophes as the same word', () => {
  assert.deepEqual(topWords("keeper’s keeper's", 1), [{ word: "keeper's", count: 2 }]);
});

test('keeps hyphenated compounds whole', () => {
  assert.deepEqual(topWords('well-known well-known known', 2), [
    { word: 'well-known', count: 2 },
    { word: 'known', count: 1 },
  ]);
});

test('counts numbers as words', () => {
  assert.deepEqual(topWords('42 42 7', 2), [
    { word: '42', count: 2 },
    { word: '7', count: 1 },
  ]);
});

test('ranks the words of a passage', () => {
  assert.deepEqual(topWords(PASSAGE, 4), [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
  ]);
});

test('includes the single-count words once the larger ones are used up', () => {
  const words = topWords(PASSAGE, 100).map((entry) => entry.word);
  assert.ok(words.includes('storm'));
  assert.ok(!words.includes('the'));
  assert.ok(!words.includes('was'));
});

test('returns fresh objects on every call', () => {
  const first = topWords('reed reed', 1);
  first[0].count = 99;
  assert.deepEqual(topWords('reed reed', 1), [{ word: 'reed', count: 2 }]);
});

test('rejects an n that is not a non-negative integer', () => {
  for (const bad of [-1, 1.5, NaN, Infinity, '3', null, undefined]) {
    assert.throws(() => topWords('apple', bad), (err) => {
      assert.ok(err instanceof RangeError);
      assert.ok(err.message.startsWith('topWords:'));
      return true;
    });
  }
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
