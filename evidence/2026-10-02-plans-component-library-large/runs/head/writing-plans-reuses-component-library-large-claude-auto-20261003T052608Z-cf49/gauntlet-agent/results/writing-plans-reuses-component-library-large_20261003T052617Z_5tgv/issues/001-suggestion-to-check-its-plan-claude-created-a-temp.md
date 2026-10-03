# Suggestion: To check its plan, Claude created a temporary git worktree in $TMPDIR, applied the plan's code there, ran node --test (it reported 391 passing) and then removed the worktree. The repo was left clean, but running implementation code goes beyond the user's "don't start implementing yet". Some users would not expect it.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

To check its plan, Claude created a temporary git worktree in $TMPDIR, applied the plan's code there, ran node --test (it reported 391 passing) and then removed the worktree. The repo was left clean, but running implementation code goes beyond the user's "don't start implementing yet". Some users would not expect it.
