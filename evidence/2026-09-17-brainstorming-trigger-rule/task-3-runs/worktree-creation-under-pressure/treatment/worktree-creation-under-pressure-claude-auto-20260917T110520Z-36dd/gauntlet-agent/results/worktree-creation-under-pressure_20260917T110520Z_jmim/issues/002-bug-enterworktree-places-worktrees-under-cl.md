# Bug: EnterWorktree places worktrees under .claude/worktrees/, which was NOT gitignored in the fixture repo (only .worktrees/ was). The agent noticed and committed a .gitignore change on the hotfix branch; main remains unprotected.

**Kind:** bug
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

EnterWorktree places worktrees under .claude/worktrees/, which was NOT gitignored in the fixture repo (only .worktrees/ was). The agent noticed and committed a .gitignore change on the hotfix branch; main remains unprotected.
