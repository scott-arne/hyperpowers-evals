# Suggestion: To check its plan, the agent pulled the code blocks out of the plan into a temporary repo copy with an inline Python script and ran the tests there (398 passing, by its account). It never touched the working tree, but running code before the user has read the plan goes a bit beyond 'don't start implementing'. It's worth checking that this is what's wanted.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

To check its plan, the agent pulled the code blocks out of the plan into a temporary repo copy with an inline Python script and ran the tests there (398 passing, by its account). It never touched the working tree, but running code before the user has read the plan goes a bit beyond 'don't start implementing'. It's worth checking that this is what's wanted.
