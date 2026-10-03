# Suggestion: While writing the plan, the agent applied all of the plan's code to a scratch clone and ran the full suite (398 tests). That checks the plan well, but it goes well beyond writing a plan, and the clone is left in $TMPDIR once cleanup is declined. The agent did say so in its summary.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

While writing the plan, the agent applied all of the plan's code to a scratch clone and ran the full suite (398 tests). That checks the plan well, but it goes well beyond writing a plan, and the clone is left in $TMPDIR once cleanup is declined. The agent did say so in its summary.
