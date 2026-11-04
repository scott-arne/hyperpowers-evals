### Task 2: `sentenceCount(text)`

**Files:**
- Create: `test/sentenceCount.test.js`
- Modify: `src/textstats.js`

`sentenceCount` splits prose at sentence terminators while avoiding the three most common false breaks: decimal numbers, dotted names such as `example.com`, and abbreviations like `Mr.` and `e.g.`. It reuses `tokenize` and `assertText` from Task 1 and appends to `src/textstats.js` without changing anything already there.

**Behaviour.**

- A terminator is a run of `.`, `!` or `?` (so `?!` and `...` are one terminator), optionally followed by closing quotes or brackets, and only when whitespace or the end of the text follows it. A period inside `3.14`, `example.com` or `a.b.c` has no whitespace after it and is not a terminator.
- A lone `.` that follows one of the listed abbreviations (`Mr`, `Mrs`, `Ms`, `Dr`, `Prof`, `St`, `Sr`, `Jr`, `vs`, `e.g`, `i.e`, compared without regard to case) does not end a sentence. Runs such as `...` or `?!` always do.
- A sentence is counted only if it contains at least one word, so a text made only of terminators has zero sentences.
- Text after the last terminator counts as a final sentence when it contains a word.
- A non-string argument throws `TypeError` with a message starting `sentenceCount:`.

- [ ] **Step 1: Write the failing test**

Create `test/sentenceCount.test.js`:

```javascript
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sentenceCount } = require('../src/textstats');

// Eight sentences, counted by hand: the question and the exclamation each end
// one, while the "Mr." and "Dr." titles and the decimal inside the fourth
// sentence must not.
const PASSAGE = [
  'Mr. Alder opened the shop at nine. Nobody came in until noon! When the first',
  'customer arrived, Dr. Wren asked whether the prices had changed. They had',
  'risen by 3.5 percent since spring. "Is that all?" she said. He nodded, and',
  'the afternoon went by quietly. By closing time the till held forty dollars.',
].join('\n');

const CASES = [
  ["", 0],
  [" ", 0],
  [".", 0],
  ["a", 1],
  ["a.", 1],
  ["a. b.", 2],
  ["a! b? c.", 3],
  ["a!? b", 2],
];

test('returns 0 for the empty string', () => {
  assert.equal(sentenceCount(''), 0);
});

test('returns 0 for whitespace only', () => {
  assert.equal(sentenceCount('  \n\t  '), 0);
});

test('returns 0 for terminators with no words', () => {
  assert.equal(sentenceCount('... ?! . ! ?'), 0);
});

test('counts one sentence with a final period', () => {
  assert.equal(sentenceCount('The tide came in.'), 1);
});

test('counts one sentence with no terminator at all', () => {
  assert.equal(sentenceCount('The tide came in'), 1);
});

test('counts a trailing fragment after the last terminator', () => {
  assert.equal(sentenceCount('The tide came in. Then it left'), 2);
});

test('throws a TypeError naming the function for a non-string', () => {
  for (const bad of [undefined, null, 7, {}, ['One.']]) {
    assert.throws(() => sentenceCount(bad), (err) => {
      assert.ok(err instanceof TypeError);
      assert.ok(err.message.startsWith('sentenceCount:'));
      return true;
    });
  }
});

test('matches every row of the reference table', () => {
  for (const [text, expected] of CASES) {
    assert.equal(sentenceCount(text), expected, JSON.stringify(text));
  }
});
```

As in Task 1, the final test runs the reference rows. The hand counts for the multi-line passage were made sentence by sentence: the exclamation mark ends the second sentence, the question mark inside the quotation ends the fifth, and `she said.` is the sixth.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test`

Expected: the new file fails with `TypeError: sentenceCount is not a function` in every test, while the 8 tests from Task 1 still pass. If the Task 1 tests fail, stop: something in the working tree changed them.

- [ ] **Step 3: Write the implementation**

In `src/textstats.js`, replace the line `module.exports = { wordCount };` with the following block. Everything above that line stays as it is.

```javascript
// Words whose trailing period does not end a sentence. Compared lower-case and
// without any opening bracket or quote. "U.S.A." style initialisms are not
// listed: they usually do end a sentence when they come last, and guessing
// otherwise would trade one error for another.
const ABBREVIATIONS = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'sr', 'jr', 'vs', 'e.g', 'i.e']);

// A terminator run ("." "?!" "...") plus any closing quotes or brackets, and
// only where whitespace or the end of the text follows. Requiring that keeps
// decimals ("3.14"), domains ("example.com") and "a.b.c" in one piece.
const TERMINATOR_PATTERN = /([.!?]+)(["'”’)\]]*)(?=\s|$)/g;

function endsWithAbbreviation(before) {
  const last = before.match(/(\S+)$/);
  if (last === null) {
    return false;
  }
  const word = last[1].replace(/^["'“‘(\[]+/, '').toLowerCase();
  return ABBREVIATIONS.has(word);
}

/**
 * Count the sentences in a piece of text.
 *
 * A sentence is a stretch of text containing at least one word and ending at a
 * terminator run, or at the end of the text. A lone period after a known
 * abbreviation does not end a sentence.
 *
 * @param {string} text
 * @returns {number}
 */
function sentenceCount(text) {
  assertText('sentenceCount', text);
  let count = 0;
  let start = 0;
  for (const match of text.matchAll(TERMINATOR_PATTERN)) {
    const before = text.slice(start, match.index);
    if (match[1] === '.' && endsWithAbbreviation(before)) {
      continue;
    }
    if (tokenize(before).length > 0) {
      count += 1;
    }
    start = match.index + match[0].length;
  }
  if (tokenize(text.slice(start)).length > 0) {
    count += 1;
  }
  return count;
}

module.exports = { wordCount, sentenceCount };
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`

Expected: 16 tests pass (8 from Task 1 and 8 new) and the summary shows `fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/textstats.js test/sentenceCount.test.js
git commit -m "feat: add sentenceCount"
```

