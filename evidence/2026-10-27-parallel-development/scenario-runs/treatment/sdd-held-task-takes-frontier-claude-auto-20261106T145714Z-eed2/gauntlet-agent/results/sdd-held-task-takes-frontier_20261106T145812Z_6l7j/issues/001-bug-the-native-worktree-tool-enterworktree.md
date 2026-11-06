# Bug: The native worktree tool (EnterWorktree) created .claude/worktrees/parallel-19d8f87d and then refused to enter it: "git could not be run to resolve it, so its git identity could not be verified." The worktree is still registered and locked in git and shows up as an untracked .claude/ directory. The user asked for a new worktree but the work ran in the main checkout. This could be a harness/sandbox problem rather than an SDD problem, but someone should look at it.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

The native worktree tool (EnterWorktree) created .claude/worktrees/parallel-19d8f87d and then refused to enter it: "git could not be run to resolve it, so its git identity could not be verified." The worktree is still registered and locked in git and shows up as an untracked .claude/ directory. The user asked for a new worktree but the work ran in the main checkout. This could be a harness/sandbox problem rather than an SDD problem, but someone should look at it.
