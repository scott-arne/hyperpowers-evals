# Task 2 Report: sentenceCount(text)

## Implementation Summary

Implemented `sentenceCount(text)` function in `src/textstats.js` that counts sentences in text while handling common false terminators.

### What Was Implemented

1. **sentenceCount function** - Counts sentences in text, returning a number
   - Validates input using existing `assertText()` helper (throws TypeError starting with "sentenceCount:" for non-strings)
   - Reuses existing `tokenize()` helper to identify words
   - Uses TERMINATOR_PATTERN regex to identify sentence-ending terminators while avoiding false positives

2. **TERMINATOR_PATTERN** - `/([.!?]+)(["'"')\]]*)(?=\s|$)/g`
   - Matches runs of `.!?` characters
   - Optionally captures closing quotes/brackets
   - Only matches when followed by whitespace or end of text
   - Avoids false breaks in decimals ("3.14"), domains ("example.com"), and dotted sequences ("a.b.c")

3. **ABBREVIATIONS Set** - Contains words whose trailing period doesn't end a sentence
   - List: mr, mrs, ms, dr, prof, st, sr, jr, vs, e.g, i.e
   - Matched case-insensitively

4. **endsWithAbbreviation() helper** - Checks if text before a period ends with an abbreviation
   - Extracts the last word before the period
   - Strips opening quotes/brackets
   - Compares against ABBREVIATIONS set (case-insensitive)

5. **Test suite** - Created `test/sentenceCount.test.js` with 9 tests
   - 8 tests from the brief specification
   - 1 additional test for PASSAGE (counts to 8 sentences)

### Test Results

**Command:** `npm test`

**Final Output:**
```
ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 92.757458
```

All tests pass:
- 10 Task 1 tests (wordCount) - all passing
- 9 Task 2 tests (sentenceCount) - all passing

### TDD Evidence

**RED Phase:**
- Created test file `test/sentenceCount.test.js` with 9 tests
- All 9 sentenceCount tests failed with `TypeError: sentenceCount is not a function`
- Task 1 tests (10) all still passed
- Failure count: 9, Pass count: 10

**GREEN Phase:**
- Implemented sentenceCount function following the brief specification exactly
- All 19 tests now pass
- Pass count: 19, Fail count: 0

### Sentence Counting Behavior Verified

The implementation correctly handles:
- Empty strings and whitespace-only text → 0 sentences
- Text with no terminators → counts as 1 sentence (if contains words)
- Text with terminators and words → counts correctly
- Abbreviations (Mr., Dr., etc.) → period doesn't end sentence
- Runs of terminators (?!, ...) → always end sentences
- Decimal numbers (3.5) → periods not treated as terminators
- Domains (example.com) → periods not treated as terminators
- Trailing text after last terminator → counted as sentence if contains words
- Multi-line passage (PASSAGE) → correctly counts 8 sentences

### Files Changed

1. `/Users/johnss51/Development/agents/hyperpowers/evals/results/workspaces/sdd-compaction-reread-claude-auto-20261104T232049Z-bf86/coding-agent-workdir/src/textstats.js`
   - Added ABBREVIATIONS constant
   - Added TERMINATOR_PATTERN constant
   - Added endsWithAbbreviation() helper function
   - Added sentenceCount() function
   - Updated module.exports to include sentenceCount

2. `/Users/johnss51/Development/agents/hyperpowers/evals/results/workspaces/sdd-compaction-reread-claude-auto-20261104T232049Z-bf86/coding-agent-workdir/test/sentenceCount.test.js`
   - Created new test file with 9 tests including PASSAGE test

### Self-Review Findings

**Code Quality:**
- ✅ Implementation matches brief specification exactly
- ✅ Reuses existing helpers (tokenize, assertText) as required
- ✅ No modifications to existing code outside sentenceCount
- ✅ Clear variable names and logical structure
- ✅ Comments explain regex patterns and logic

**Correctness:**
- ✅ All test cases pass including edge cases
- ✅ PASSAGE counts to exactly 8 as expected
- ✅ Error handling with proper TypeError message
- ✅ Abbreviation handling with case-insensitive comparison

**Testing:**
- ✅ TDD approach followed: RED → GREEN → commit
- ✅ 9 tests created (8 from brief + 1 for PASSAGE)
- ✅ All existing Task 1 tests still pass
- ✅ Test output is clean with 19 passing tests

### Concerns

None. Implementation is complete and all requirements met.

## Fix Round 1: Curly Quote Support

**Finding Verified:** The TERMINATOR_PATTERN and endsWithAbbreviation regex patterns did not include Unicode curly quotes (U+201C, U+201D, U+2018, U+2019), causing sentences with curly quotes to be miscounted.

Controller repro confirmed:
- `sentenceCount('He said "Go." Then left.')` was returning 1 (expected 2)
- `sentenceCount(''Hi.' Ok')` was returning 1 (expected 2)

**Fix Applied:**

1. **Updated TERMINATOR_PATTERN** (line 39)
   - From: `/([.!?]+)(["'"')\]]*)(?=\s|$)/g` (closing quotes only)
   - To: `/([.!?]+)(["\\u201d'\\u2019)\\]]*)(?=\\s|$)/g` (includes U+201D and U+2019)

2. **Updated endsWithAbbreviation replace pattern** (line 46)
   - From: `/^["'"'(\[]+/` (opening quotes only)
   - To: `/^["\\u201c'\\u2018([\\[]+/` (includes U+201C and U+2018)

**Test Added:**

Created test `'recognizes sentences with curly quotes'` in `test/sentenceCount.test.js`:
- Tests curly double quotes (U+201C and U+201D): `'He said "Go." Then left.'` expects 2 sentences
- Tests curly single quotes (U+2018 and U+2019): `''Hi.' Ok.'` expects 2 sentences
- Implemented using `String.fromCodePoint()` to avoid file encoding issues

**RED Phase:**
```
npm test output:
✖ recognizes sentences with curly quotes (2.510792ms)
  AssertionError: Expected values to be strictly equal:
  1 !== 2
```

**GREEN Phase:**
```
npm test output:
✔ recognizes sentences with curly quotes (2.287125ms)
ℹ tests 20
ℹ pass 20
ℹ fail 0
```

**Commit:** `4af5ad8` fix: add support for curly quotes in sentence boundary detection

**Files Changed:**
- `src/textstats.js`: Updated TERMINATOR_PATTERN and endsWithAbbreviation regex patterns
- `test/sentenceCount.test.js`: Added test for curly-quoted sentences
