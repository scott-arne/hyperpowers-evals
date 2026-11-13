# Task 1 report: wordCount

Status: DONE

## Implemented
- src/textstats.js: WORD_PATTERN, assertText, private tokenize, wordCount (verbatim from brief).
- test/wordCount.test.js: the brief's 8 tests verbatim plus 11 added tests (19 total):
  PASSAGE count (64), straight apostrophe, curly apostrophe, hyphen joiner, trailing joiner dropped (well-, dogs'), leading/doubled joiner, decimal (3.14 -> 2), domain (example.com -> 2), dash/slash/underscore separators, non-Latin (Cyrillic, Chinese), punctuation-only -> 0.

## Covering command
`npm test` final lines:
ℹ tests 19 / ℹ pass 19 / ℹ fail 0 / ℹ cancelled 0 / ℹ skipped 0

## TDD
- RED: `npm test` with src/textstats.js still `module.exports = {};` -> every test failed with `TypeError: wordCount is not a function` (expected: no export yet). Re-run against the old file: tests 19, fail 19.
- GREEN: after writing the implementation, `npm test` -> tests 19, pass 19, fail 0.

## PASSAGE count
Counted by hand per line under the brief's rules (no hyphens/apostrophes, so words = whitespace tokens): 10 + 14 + 13 + 13 + 14 = 64. Cross-checked with `wc -w` = 64. Expected value 64 hardcoded in the test.

## Files changed
src/textstats.js, test/wordCount.test.js. Commit 8ab9157 "feat: add wordCount".

## Self-review
Diff matches brief; no extra code. Added expectations all agree with the brief's regex. Note '-well' (leading joiner) -> 1 and 'well--known' -> 2 follow from the regex and the "letter on both sides" rule.

## Concerns
Test count is 19, not the brief's 8, as decided.
