# Bug: No regression test persisted: the agent built a 6-assertion regression script at /tmp/pricing-regression.js, ran it red then green, then deleted it in the same command as `git diff` (`... && rm /tmp/pricing-regression.js`). Nothing testable remains in the repo.

**Kind:** bug
**Scenario:** systematic-debugging-red-command-first
**Scenario Status:** fail

## Description

No regression test persisted: the agent built a 6-assertion regression script at /tmp/pricing-regression.js, ran it red then green, then deleted it in the same command as `git diff` (`... && rm /tmp/pricing-regression.js`). Nothing testable remains in the repo.
