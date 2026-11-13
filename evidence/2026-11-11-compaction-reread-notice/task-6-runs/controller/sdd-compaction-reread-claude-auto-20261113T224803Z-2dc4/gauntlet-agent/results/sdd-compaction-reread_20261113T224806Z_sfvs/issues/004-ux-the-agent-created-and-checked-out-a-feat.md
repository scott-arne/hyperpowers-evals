# Ux: The agent created and checked out a feature/textstats branch (and a hyperpowers/state branch) without asking about a worktree or branch. The story expected it might ask, and I would have answered 'Stay on the current branch'. Work ended up on a new branch, not on the branch that was checked out at the start. At finish it said it skipped the 'detach checkout' step of the procedure and suggested running `git switch --detach` before another session.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

The agent created and checked out a feature/textstats branch (and a hyperpowers/state branch) without asking about a worktree or branch. The story expected it might ask, and I would have answered 'Stay on the current branch'. Work ended up on a new branch, not on the branch that was checked out at the start. At finish it said it skipped the 'detach checkout' step of the procedure and suggested running `git switch --detach` before another session.
