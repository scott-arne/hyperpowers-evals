# Suggestion: To validate the plan, Claude created a temporary git worktree in /tmp, pulled the code blocks out of the plan with a script, applied them there and ran the full test suite (it reported 393 passing). It cleaned up afterward, but the user only asked for a plan. Some users may not expect it to run code against the repo before they've read the plan.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

To validate the plan, Claude created a temporary git worktree in /tmp, pulled the code blocks out of the plan with a script, applied them there and ran the full test suite (it reported 393 passing). It cleaned up afterward, but the user only asked for a plan. Some users may not expect it to run code against the repo before they've read the plan.
