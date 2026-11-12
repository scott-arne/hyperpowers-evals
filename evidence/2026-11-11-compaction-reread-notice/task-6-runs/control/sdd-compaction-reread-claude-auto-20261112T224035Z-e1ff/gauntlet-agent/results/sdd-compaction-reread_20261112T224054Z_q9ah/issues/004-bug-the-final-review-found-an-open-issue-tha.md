# Bug: The final review found an open issue that wasn't fixed: the TERMINATOR_PATTERN regex slows down roughly with the square of the input length ('.'.repeat(40000)+'x' takes about 5s in sentenceCount). It was left in because the plan specifies that regex word for word.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The final review found an open issue that wasn't fixed: the TERMINATOR_PATTERN regex slows down roughly with the square of the input length ('.'.repeat(40000)+'x' takes about 5s in sentenceCount). It was left in because the plan specifies that regex word for word.
