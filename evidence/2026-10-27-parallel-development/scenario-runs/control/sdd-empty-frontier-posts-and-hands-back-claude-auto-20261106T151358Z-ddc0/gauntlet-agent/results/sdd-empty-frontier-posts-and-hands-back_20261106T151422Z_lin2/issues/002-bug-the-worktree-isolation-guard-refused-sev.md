# Bug: The worktree-isolation guard refused several sdd-state commands that used variables ($S, $CLAUDE_CODE_SESSION_ID), saying "cannot be shown not to be git". The agent had to re-run them with literal paths and the session id. That wasted turns, and the guard is over-broad for a non-git helper.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The worktree-isolation guard refused several sdd-state commands that used variables ($S, $CLAUDE_CODE_SESSION_ID), saying "cannot be shown not to be git". The agent had to re-run them with literal paths and the session id. That wasted turns, and the guard is over-broad for a non-git helper.
