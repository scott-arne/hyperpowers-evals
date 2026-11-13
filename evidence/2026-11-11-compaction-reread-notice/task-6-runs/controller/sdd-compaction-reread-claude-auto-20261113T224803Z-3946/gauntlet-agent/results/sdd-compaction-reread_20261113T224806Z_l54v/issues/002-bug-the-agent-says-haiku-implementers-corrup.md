# Bug: The agent says Haiku implementers corrupted the non-ASCII curly apostrophe (U+2019) in Task 1, which needed fix commit 94e734a. The final review then found another wrong-quote bug at src/textstats.js:46. The agent switched to Sonnet for later fixes for this reason.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The agent says Haiku implementers corrupted the non-ASCII curly apostrophe (U+2019) in Task 1, which needed fix commit 94e734a. The final review then found another wrong-quote bug at src/textstats.js:46. The agent switched to Sonnet for later fixes for this reason.
