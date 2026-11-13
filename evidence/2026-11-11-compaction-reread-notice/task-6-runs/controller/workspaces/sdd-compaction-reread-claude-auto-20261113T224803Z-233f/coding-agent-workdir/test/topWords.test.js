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

// D1: Test PASSAGE with the expected hand counts (keeper 3, lamp 3, night 2, tower 2)
test('D1: topWords(PASSAGE, 4) returns keeper, lamp, night, tower in order', () => {
  const result = topWords(PASSAGE, 4);
  assert.deepEqual(result, [
    { word: 'keeper', count: 3 },
    { word: 'lamp', count: 3 },
    { word: 'night', count: 2 },
    { word: 'tower', count: 2 },
  ]);
});

// D1: Verify no stop words appear in the full ranking of PASSAGE
test('D1: topWords(PASSAGE, 100) contains no stop words', () => {
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'had', 'has',
    'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
    'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'were',
    'will', 'with',
  ]);
  const result = topWords(PASSAGE, 100);
  for (const entry of result) {
    assert.ok(!stopWords.has(entry.word), `Stop word "${entry.word}" found in results`);
  }
});

// D2: Test case folding (Éclair/éclair counted together)
test('D2: Case folding - uppercase and lowercase of same word counted together', () => {
  const result = topWords('Éclair éclair ÉCLAIR', 1);
  assert.deepEqual(result, [{ word: 'éclair', count: 3 }]);
});

// D2: Test typographic apostrophe folding (keeper's and keeper's counted together)
test('D2: Typographic apostrophe folding - straight and curly apostrophes counted together', () => {
  const result = topWords("keeper’s keeper's", 1);
  assert.deepEqual(result, [{ word: "keeper's", count: 2 }]);
});

// D2: Hyphenated words kept whole
test('D2: Hyphenated words kept whole and counted together', () => {
  const result = topWords('well-known well-known', 1);
  assert.deepEqual(result, [{ word: 'well-known', count: 2 }]);
});

// D2: Numbers are counted as words
test('D2: Numbers are counted as words', () => {
  const result = topWords('apple 123 apple 123', 2);
  assert.deepEqual(result, [
    { word: '123', count: 2 },
    { word: 'apple', count: 2 },
  ]);
});

// D2: n larger than distinct words returns all
test('D2: n larger than distinct-word count returns all words', () => {
  const result = topWords('apple banana cherry', 100);
  assert.equal(result.length, 3);
});

// D2: Ties ordered by code-unit order (not locale)
test('D2: Ties ordered by code-unit order (digits/lowercase before accented)', () => {
  const result = topWords('Zoo zoo éclairs éclairs', 4);
  // Both 'zoo' (122) and 'éclairs' (233) have count 2. 'zoo' < 'éclairs' in code-unit order
  assert.deepEqual(result, [
    { word: 'zoo', count: 2 },
    { word: 'éclairs', count: 2 },
  ]);
});

// D2: Text is checked before n (non-string text with bad n throws TypeError)
test('D2: Text checked before n - non-string text with bad n throws TypeError', () => {
  assert.throws(() => topWords(123, 'not a number'), (err) => {
    assert.ok(err instanceof TypeError);
    assert.ok(err.message.startsWith('topWords:'));
    return true;
  });
});

// D2: RangeError for non-integer n
test('D2: RangeError for non-integer n (fraction)', () => {
  assert.throws(() => topWords('apple', 1.5), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('topWords:'));
    return true;
  });
});

// D2: RangeError for negative n
test('D2: RangeError for negative n', () => {
  assert.throws(() => topWords('apple', -1), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('topWords:'));
    return true;
  });
});

// D2: RangeError for undefined n
test('D2: RangeError for undefined n', () => {
  assert.throws(() => topWords('apple', undefined), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('topWords:'));
    return true;
  });
});

// D2: RangeError for NaN
test('D2: RangeError for NaN', () => {
  assert.throws(() => topWords('apple', NaN), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('topWords:'));
    return true;
  });
});

// D2: RangeError for string n
test('D2: RangeError for string n', () => {
  assert.throws(() => topWords('apple', '5'), (err) => {
    assert.ok(err instanceof RangeError);
    assert.ok(err.message.startsWith('topWords:'));
    return true;
  });
});

// D2: Results are fresh objects (mutating returned entry doesn't affect later calls)
test('D2: Results are fresh objects - mutating result does not affect later calls', () => {
  const result1 = topWords('apple apple banana', 2);
  result1[0].count = 999; // Mutate the returned object
  const result2 = topWords('apple apple banana', 2);
  assert.equal(result2[0].count, 2, 'Count should be 2, not 999');
});

// D2: Contraction words kept whole
test('D2: Contractions kept whole', () => {
  const result = topWords("don't don't", 1);
  assert.deepEqual(result, [{ word: "don't", count: 2 }]);
});
