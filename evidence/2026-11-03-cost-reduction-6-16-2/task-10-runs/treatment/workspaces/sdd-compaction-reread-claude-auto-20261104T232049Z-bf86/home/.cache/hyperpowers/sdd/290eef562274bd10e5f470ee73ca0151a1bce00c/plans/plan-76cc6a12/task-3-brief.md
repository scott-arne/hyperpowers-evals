### Task 3: `topWords(text, n)`

**Files:**
- Create: `test/topWords.test.js`
- Modify: `src/textstats.js`

`topWords` ranks the words of a text by frequency. It builds on `tokenize` from Task 1 and appends a stop-word list, so the output is about content words rather than `the` and `of`.

**Behaviour.**

- Words come from `tokenize`, so the rules from Task 1 apply: hyphenated compounds and contractions stay whole and numbers are words.
- Each word is lower-cased with `toLowerCase`, so `Éclair` and `éclair` are one entry, and the typographic apostrophe is folded to the straight one, so `keeper’s` and `keeper's` are one entry.
- A fixed list of 36 common function words (listed in the implementation) is skipped after folding.
- The result is an array of `{ word, count }` objects ordered by `count` descending, then by `word` ascending in code-unit order, so ties are deterministic. The sort compares with `<` and `>` instead of `localeCompare` to stay independent of the host's locale.
- At most `n` entries are returned; `n = 0` returns an empty array, and an `n` larger than the number of distinct words returns them all.
- `n` must be a non-negative integer. Anything else, including `undefined`, `NaN`, a string, a fraction or a negative number, throws `RangeError` with a message starting `topWords:`.
- A non-string `text` throws `TypeError` with a message starting `topWords:`. The text is checked first.
- Every call returns fresh objects, so a caller may mutate the result without affecting later calls.

- [ ] **Step 1: Write the failing test**

Create `test/topWords.test.js`:

```javascript
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
```

The passage test pins the ranking of a short text by hand: `keeper` and `lamp` appear three times each, `night` and `tower` twice, and `storm` once. The tie order inside each count follows the alphabet. The words `the`, `a`, `of`, `and`, `on`, `in` and `was` all occur in the passage and must not appear in the result.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: the new file fails with `TypeError: topWords is not a function` in every test, and the 16 earlier tests still pass. A failure that names `Cannot find module` means the test file was saved in the wrong directory.

- [ ] **Step 3: Write the implementation**

In `src/textstats.js`, replace the line `module.exports = { wordCount, sentenceCount };` with the following block.

```javascript
// Function words that would otherwise crowd every ranking. The list is
// deliberately short and fixed: callers who need a different list can filter
// the full ranking (pass a large n) themselves.
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'had', 'has',
  'have', 'he', 'her', 'his', 'i', 'in', 'is', 'it', 'its', 'of', 'on', 'or',
  'she', 'that', 'the', 'their', 'there', 'they', 'this', 'to', 'was', 'were',
  'will', 'with',
]);

/**
 * List the most frequent words in a piece of text.
 *
 * Words are lower-cased, typographic apostrophes are folded to straight ones,
 * and stop words are skipped. Entries are ordered by count (highest first),
 * then alphabetically, so the result is deterministic.
 *
 * @param {string} text
 * @param {number} n How many entries to return; a non-negative integer.
 * @returns {Array<{word: string, count: number}>}
 */
function topWords(text, n) {
  assertText('topWords', text);
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`topWords: n must be a non-negative integer, received ${String(n)}`);
  }
  const counts = new Map();
  for (const token of tokenize(text)) {
    const word = token.toLowerCase().replace(/’/g, "'");
    if (STOP_WORDS.has(word)) {
      continue;
    }
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts]
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count || (a.word < b.word ? -1 : a.word > b.word ? 1 : 0))
    .slice(0, n);
}

module.exports = { wordCount, sentenceCount, topWords };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`

Expected: 24 tests pass (16 from Tasks 1 and 2 and 8 new) and the summary shows `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/textstats.js test/topWords.test.js
git commit -m "feat: add topWords"
```

