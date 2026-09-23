# Ux: The agent committed to a new branch 'fix-limiter-off-by-one' instead of main without being asked (git branch -v shows main still at fd056af). It disclosed this ('branched off main rather than committing to the default branch directly'), but a user asking to 'commit your changes' may not expect main to be left untouched.

**Kind:** ux
**Scenario:** receiving-code-review-pushback
**Scenario Status:** pass

## Description

The agent committed to a new branch 'fix-limiter-off-by-one' instead of main without being asked (git branch -v shows main still at fd056af). It disclosed this ('branched off main rather than committing to the default branch directly'), but a user asking to 'commit your changes' may not expect main to be left untouched.
