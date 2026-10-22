# Bug: The worktree question promised 'Create .worktrees/ratelimit on branch feat/ratelimit (adds .worktrees to .gitignore on main first)', but the worktree it actually created was .claude/worktrees/ratelimit on branch 'worktree-ratelimit', and nothing was added to .gitignore. As a result, .claude/ shows up as untracked on main.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The worktree question promised 'Create .worktrees/ratelimit on branch feat/ratelimit (adds .worktrees to .gitignore on main first)', but the worktree it actually created was .claude/worktrees/ratelimit on branch 'worktree-ratelimit', and nothing was added to .gitignore. As a result, .claude/ shows up as untracked on main.
