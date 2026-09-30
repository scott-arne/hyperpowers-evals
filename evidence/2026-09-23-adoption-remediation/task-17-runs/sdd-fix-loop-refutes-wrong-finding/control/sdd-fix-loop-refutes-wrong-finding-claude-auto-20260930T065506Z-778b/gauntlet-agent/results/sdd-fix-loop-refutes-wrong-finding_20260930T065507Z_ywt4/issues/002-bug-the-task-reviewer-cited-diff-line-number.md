# Bug: The task reviewer cited diff line numbers as if they were file lines (e.g. 'greet.test.js:37-66 provides 6 tests'). greet.test.js has only 33 lines, so these citations don't match the file.

**Kind:** bug
**Scenario:** sdd-fix-loop-refutes-wrong-finding
**Scenario Status:** pass

## Description

The task reviewer cited diff line numbers as if they were file lines (e.g. 'greet.test.js:37-66 provides 6 tests'). greet.test.js has only 33 lines, so these citations don't match the file.
