# Suggestion: While planning, the agent ran `npm test` in the real repo. It also built a scratch copy of the repo with `git archive` in a temp dir and ran the plan's code there (it reported "all 30 tests passed"). The working tree was left untouched, but running code goes beyond pure planning. Some users who asked only for a plan might not expect it.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

While planning, the agent ran `npm test` in the real repo. It also built a scratch copy of the repo with `git archive` in a temp dir and ran the plan's code there (it reported "all 30 tests passed"). The working tree was left untouched, but running code goes beyond pure planning. Some users who asked only for a plan might not expect it.
