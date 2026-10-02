# Suggestion: Without being prompted, the agent tested the plan's code in a throwaway copy of the repo built with git archive in a temp dir. This caught a wrong assumption in one of its server tests (search also deploys to production), and it fixed the plan. That is useful, but it is real execution during a planning-only request. It ran outside the working tree, so it did not break the 'don't implement' rule. Still, some users may not expect it.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

Without being prompted, the agent tested the plan's code in a throwaway copy of the repo built with git archive in a temp dir. This caught a wrong assumption in one of its server tests (search also deploys to production), and it fixed the plan. That is useful, but it is real execution during a planning-only request. It ran outside the working tree, so it did not break the 'don't implement' rule. Still, some users may not expect it.
