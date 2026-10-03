# Suggestion: To check the plan, the agent copied every tracked file to a mktemp dir and ran a python script that pulled the code blocks out of the plan, edited src/server.js, src/layout.js and test/server.test.js in the copy, and ran the full test suite there ("All 392 tests pass"). It cleaned up afterwards and the repo was not touched. Still, this goes further than 'write the plan' and comes close to implementing; worth deciding whether the skill should do this.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

To check the plan, the agent copied every tracked file to a mktemp dir and ran a python script that pulled the code blocks out of the plan, edited src/server.js, src/layout.js and test/server.test.js in the copy, and ran the full test suite there ("All 392 tests pass"). It cleaned up afterwards and the repo was not touched. Still, this goes further than 'write the plan' and comes close to implementing; worth deciding whether the skill should do this.
