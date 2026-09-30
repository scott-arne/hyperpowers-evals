# Bug: The task reviewer's line citations are off by one or two against the real file. It cited greet.test.js:12-15 for the edge-case tests and 7-10 for normal input; the actual lines are 10-14 and 5-8. It may be quoting diff hunk line numbers. The controller then repeated "greet.test.js:12-15" as corroboration in the ledger, although its own citation (line 11) was correct.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The task reviewer's line citations are off by one or two against the real file. It cited greet.test.js:12-15 for the edge-case tests and 7-10 for normal input; the actual lines are 10-14 and 5-8. It may be quoting diff hunk line numbers. The controller then repeated "greet.test.js:12-15" as corroboration in the ledger, although its own citation (line 11) was correct.
