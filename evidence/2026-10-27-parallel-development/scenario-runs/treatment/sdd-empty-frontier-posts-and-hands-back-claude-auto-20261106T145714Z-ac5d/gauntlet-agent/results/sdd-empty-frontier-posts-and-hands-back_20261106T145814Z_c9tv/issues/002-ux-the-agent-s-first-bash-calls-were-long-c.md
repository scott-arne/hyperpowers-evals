# Ux: The agent's first Bash calls were long compound commands (sync, ledger printf, git switch chained together), and the worktree guard rejected them as 'too complex'. The agent then retried them one by one. This wasted turns.

**Kind:** ux
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The agent's first Bash calls were long compound commands (sync, ledger printf, git switch chained together), and the worktree guard rejected them as 'too complex'. The agent then retried them one by one. This wasted turns.
