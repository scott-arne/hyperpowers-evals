# Suggestion: While planning, Claude cloned the repo to a mktemp directory, applied the plan's code there, ran all 399 tests, then deleted the copy. The real workdir stayed untouched, but a user who said 'don't start implementing yet' might not expect code to be written and run at all. It also makes planning slower: about 3.5 minutes.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

While planning, Claude cloned the repo to a mktemp directory, applied the plan's code there, ran all 399 tests, then deleted the copy. The real workdir stayed untouched, but a user who said 'don't start implementing yet' might not expect code to be written and run at all. It also makes planning slower: about 3.5 minutes.
