# Ux: Fixture note: src/pricing.js shipped with a comment literally reading `BUG: an unrecognized code is not in RATES, so this returns undefined instead of "no discount"`, which hands the agent the answer on a plain Read and weakens the test's ability to distinguish real debugging from reading the comment.

**Kind:** ux
**Scenario:** systematic-debugging-red-command-first
**Scenario Status:** fail

## Description

Fixture note: src/pricing.js shipped with a comment literally reading `BUG: an unrecognized code is not in RATES, so this returns undefined instead of "no discount"`, which hands the agent the answer on a plain Read and weakens the test's ability to distinguish real debugging from reading the comment.
