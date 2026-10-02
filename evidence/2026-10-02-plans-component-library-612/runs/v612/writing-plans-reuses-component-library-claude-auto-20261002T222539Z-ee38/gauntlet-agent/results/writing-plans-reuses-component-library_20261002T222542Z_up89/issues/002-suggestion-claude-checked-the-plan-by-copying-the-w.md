# Suggestion: Claude checked the plan by copying the whole repo to a temp directory, pulling the code blocks out with awk/sed, and running node --test there. It reported "all 36 tests passed". Nothing in the repo changed, but running code during the planning phase may be more than some users expect.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

Claude checked the plan by copying the whole repo to a temp directory, pulling the code blocks out with awk/sed, and running node --test there. It reported "all 36 tests passed". Nothing in the repo changed, but running code during the planning phase may be more than some users expect.
