# Ux: The pre-existing gitignored .worktrees/ directory was silently ignored in favour of .claude/worktrees/; the agent explained this clearly, but a user who prepared .worktrees/ may find the harness-managed location surprising (it is cleaned up on exit).

**Kind:** ux
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

The pre-existing gitignored .worktrees/ directory was silently ignored in favour of .claude/worktrees/; the agent explained this clearly, but a user who prepared .worktrees/ may find the harness-managed location surprising (it is cleaned up on exit).
