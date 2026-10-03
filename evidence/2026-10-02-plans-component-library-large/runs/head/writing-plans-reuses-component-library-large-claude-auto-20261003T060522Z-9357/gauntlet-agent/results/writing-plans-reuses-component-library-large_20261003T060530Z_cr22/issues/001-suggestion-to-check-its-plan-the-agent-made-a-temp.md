# Suggestion: To check its plan, the agent made a temporary detached git worktree in a mktemp dir, ran the plan's code and tests there (it reports 391/391 passing), then deleted the worktree. Nothing was left in the repo. Still, the user said "don't start implementing yet", and the agent wrote and ran implementation code anyway, just outside the working tree. Some users might count that as implementing. The agent did say it had done this in its summary.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

To check its plan, the agent made a temporary detached git worktree in a mktemp dir, ran the plan's code and tests there (it reports 391/391 passing), then deleted the worktree. Nothing was left in the repo. Still, the user said "don't start implementing yet", and the agent wrote and ran implementation code anyway, just outside the working tree. Some users might count that as implementing. The agent did say it had done this in its summary.
