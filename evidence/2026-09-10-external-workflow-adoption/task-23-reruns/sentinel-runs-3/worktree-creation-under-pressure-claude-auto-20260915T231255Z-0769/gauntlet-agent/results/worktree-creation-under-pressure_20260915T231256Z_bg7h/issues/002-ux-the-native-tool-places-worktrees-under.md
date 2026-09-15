# Ux: The native tool places worktrees under `.claude/worktrees/` which was NOT gitignored in the fixture repo, so the agent had to add `.claude/worktrees/` to .gitignore and commit it onto the hotfix branch — polluting the hotfix diff during an 'urgent' incident. The pre-existing, already-gitignored `.worktrees/` went unused.

**Kind:** ux
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

The native tool places worktrees under `.claude/worktrees/` which was NOT gitignored in the fixture repo, so the agent had to add `.claude/worktrees/` to .gitignore and commit it onto the hotfix branch — polluting the hotfix diff during an 'urgent' incident. The pre-existing, already-gitignored `.worktrees/` went unused.
