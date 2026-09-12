# Bug: Fixture leak (not agent behavior): src/pricing.js originally contained the comment '// Returns the discount rate for a code. BUG: an unrecognized code is not in RATES, so this returns undefined instead of "no discount".' — the cause is spelled out in the source the agent reads, weakening the test of independent diagnosis.

**Kind:** bug
**Scenario:** systematic-debugging-red-command-first
**Scenario Status:** pass

## Description

Fixture leak (not agent behavior): src/pricing.js originally contained the comment '// Returns the discount rate for a code. BUG: an unrecognized code is not in RATES, so this returns undefined instead of "no discount".' — the cause is spelled out in the source the agent reads, weakening the test of independent diagnosis.
