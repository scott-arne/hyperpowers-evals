### Task 1: `wordCount(text)`

**Files:**
- Create: `test/wordCount.test.js`
- Modify: `src/textstats.js`

`wordCount` is the foundation of the module. It also introduces the private `tokenize` helper and the `assertText` argument check that the later tasks reuse, so the rules decided here (what a "word" is, what counts as a joiner) bind every later statistic.

**Behaviour.**

- A word is a maximal run of Unicode letters or digits (`\p{L}`, `\p{N}`), in any script.
- A single straight (`'`) or typographic (`’`) apostrophe, or a single hyphen, joins two runs into one word, but only when a letter or digit sits on both sides. `don't`, `keeper’s` and `well-known` are one word each. `well-` and `dogs'` are the words `well` and `dogs`, with the stray joiner dropped.
- Everything else separates words: whitespace, sentence punctuation, em and en dashes, slashes, underscores, and the point in a decimal number or domain name. `3.14` is two words (`3` and `14`) and `example.com` is two (`example` and `com`).
- A string with no letters or digits has zero words, however long it is.
- A non-string argument throws `TypeError` with a message starting `wordCount:`.

- [ ] **Step 1: Write the failing test**

Create `test/wordCount.test.js`:

```javascript
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wordCount } = require('../src/textstats');

// A passage whose word count was established independently with `wc -w`:
// it has no standalone punctuation and no hyphenated or apostrophe words, so
// whitespace-separated tokens and words coincide.
const PASSAGE = [
  'The lighthouse keeper climbed the spiral stairs every evening, counting',
  'each step as his father had taught him. There were one hundred and twelve,',
  'and on stormy nights the number never seemed to change, though his legs',
  'insisted otherwise. At the top he trimmed the wick, polished the great lens,',
  'and watched the beam sweep across the water toward ships he would never meet.',
].join('\n');

const CASES = [
  ["", 0],
  [" ", 0],
  ["a", 1],
  ["A", 1],
  ["I", 1],
  ["a b", 2],
  ["a  b", 2],
  ["a\tb", 2],
];

test('returns 0 for the empty string', () => {
  assert.equal(wordCount(''), 0);
});

test('returns 0 for a string of only whitespace', () => {
  assert.equal(wordCount('   \t\n  \r\n '), 0);
});

test('returns 1 for a single word', () => {
  assert.equal(wordCount('hello'), 1);
});

test('counts words separated by single spaces', () => {
  assert.equal(wordCount('the quick brown fox'), 4);
});

test('ignores leading, trailing and repeated whitespace', () => {
  assert.equal(wordCount('   the   quick \t brown\n\nfox   '), 4);
});

test('treats newlines and tabs as separators', () => {
  assert.equal(wordCount('one\ntwo\tthree\r\nfour'), 4);
});

test('throws a TypeError naming the function for a non-string', () => {
  for (const bad of [undefined, null, 42, {}, [], ['a b']]) {
    assert.throws(() => wordCount(bad), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('wordCount:'));
      return true;
    });
  }
});

test('matches every row of the reference table', () => {
  for (const [text, expected] of CASES) {
    assert.equal(wordCount(text), expected, JSON.stringify(text));
  }
});
```

The file ends with a table-driven test over the reference rows. The expected numbers were worked out by hand from the rules above, not copied from the implementation's output.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: the run fails. Every test in `test/wordCount.test.js` reports `TypeError: wordCount is not a function`, because `src/textstats.js` still exports an empty object. If the failure is anything else (a syntax error in the test file, a missing module), fix the test file and run again before moving on.

- [ ] **Step 3: Write the implementation**

Replace the line `module.exports = {};` in `src/textstats.js` with the following. The file is otherwise empty at this point, so this is the whole file.

```javascript
// A word is a run of letters or digits (any script), optionally joined to the
// next run by a single apostrophe (straight or typographic) or hyphen. The
// joiners are only part of a word when letters or digits sit on both sides, so
// a trailing "well-" or "dogs'" loses its joiner. Everything else, including
// em dashes, periods and underscores, separates words.
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

function assertText(fn, value) {
  if (typeof value !== 'string') {
    throw new TypeError(`${fn}: text must be a string, received ${value === null ? 'null' : typeof value}`);
  }
}

// Private: the single definition of "word" shared by every statistic below.
function tokenize(text) {
  return text.match(WORD_PATTERN) ?? [];
}

/**
 * Count the words in a piece of text.
 *
 * @param {string} text
 * @returns {number}
 */
function wordCount(text) {
  assertText('wordCount', text);
  return tokenize(text).length;
}

module.exports = { wordCount };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`

Expected: all 8 tests pass and the summary shows `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/textstats.js test/wordCount.test.js
git commit -m "feat: add wordCount"
```

