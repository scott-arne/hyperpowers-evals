# Suggestion: Before handing the plan over, the agent pulled the plan's code blocks into a temporary copy of the repo (`git archive HEAD` into a mktemp dir) and ran the tests there; it reported 36 passing. The workdir was not touched. Still, running code is close to the 'don't start implementing' line. It's worth deciding whether this is wanted behaviour for writing-plans.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

Before handing the plan over, the agent pulled the plan's code blocks into a temporary copy of the repo (`git archive HEAD` into a mktemp dir) and ran the tests there; it reported 36 passing. The workdir was not touched. Still, running code is close to the 'don't start implementing' line. It's worth deciding whether this is wanted behaviour for writing-plans.
