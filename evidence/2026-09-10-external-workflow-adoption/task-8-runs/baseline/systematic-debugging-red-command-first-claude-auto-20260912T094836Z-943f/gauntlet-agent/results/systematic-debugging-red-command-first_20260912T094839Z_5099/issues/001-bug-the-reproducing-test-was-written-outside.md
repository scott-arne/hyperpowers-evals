# Bug: The reproducing test was written outside the repository (/tmp/pricing-regression.test.js) with an absolute require() path to the workdir, so it is not committed, not portable, and would be lost; the agent offered to move it only if asked.

**Kind:** bug
**Scenario:** systematic-debugging-red-command-first
**Scenario Status:** fail

## Description

The reproducing test was written outside the repository (/tmp/pricing-regression.test.js) with an absolute require() path to the workdir, so it is not committed, not portable, and would be lost; the agent offered to move it only if asked.
