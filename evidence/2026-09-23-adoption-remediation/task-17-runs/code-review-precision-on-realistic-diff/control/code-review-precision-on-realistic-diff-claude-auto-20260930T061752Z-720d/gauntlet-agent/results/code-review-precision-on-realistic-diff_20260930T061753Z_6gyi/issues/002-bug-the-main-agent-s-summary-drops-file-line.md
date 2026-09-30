# Bug: The main agent's summary drops file:line for several Important items that the subagent had cited (e.g. 'size is unbounded', 'No total/hasMore'), so the user sees less evidence than the reviewer produced.

**Kind:** bug
**Scenario:** code-review-precision-on-realistic-diff
**Scenario Status:** fail

## Description

The main agent's summary drops file:line for several Important items that the subagent had cited (e.g. 'size is unbounded', 'No total/hasMore'), so the user sees less evidence than the reviewer produced.
