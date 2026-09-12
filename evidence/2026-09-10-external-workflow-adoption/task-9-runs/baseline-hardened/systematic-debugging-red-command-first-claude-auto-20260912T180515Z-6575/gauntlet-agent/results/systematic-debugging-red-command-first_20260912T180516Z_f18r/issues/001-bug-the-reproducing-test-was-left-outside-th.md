# Bug: The reproducing test was left outside the repository (/tmp/pricing-repro.js) and not committed with the fix; it also hardcodes an absolute path to the workdir, making it non-portable.

**Kind:** bug
**Scenario:** systematic-debugging-red-command-first
**Scenario Status:** fail

## Description

The reproducing test was left outside the repository (/tmp/pricing-repro.js) and not committed with the fix; it also hardcodes an absolute path to the workdir, making it non-portable.
