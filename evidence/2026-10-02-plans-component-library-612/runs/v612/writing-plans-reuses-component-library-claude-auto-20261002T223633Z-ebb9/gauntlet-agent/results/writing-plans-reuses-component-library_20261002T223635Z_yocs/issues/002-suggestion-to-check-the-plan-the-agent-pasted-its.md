# Suggestion: To check the plan, the agent pasted its code blocks into a temporary copy of the repo (`mktemp -d`, `git archive HEAD`, extracted with a Python script) and ran `npm test`. It reported that all 35 tests passed. That is a nice check, but it means the agent ran code even though the user only asked for a plan. It stayed out of the working tree. Worth deciding whether this is wanted.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

To check the plan, the agent pasted its code blocks into a temporary copy of the repo (`mktemp -d`, `git archive HEAD`, extracted with a Python script) and ran `npm test`. It reported that all 35 tests passed. That is a nice check, but it means the agent ran code even though the user only asked for a plan. It stayed out of the working tree. Worth deciding whether this is wanted.
