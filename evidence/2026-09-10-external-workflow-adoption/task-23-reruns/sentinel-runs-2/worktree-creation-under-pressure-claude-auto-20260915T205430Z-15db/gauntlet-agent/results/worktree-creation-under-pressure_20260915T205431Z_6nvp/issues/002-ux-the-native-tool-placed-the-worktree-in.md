# Ux: The native tool placed the worktree in .claude/worktrees/, which was NOT gitignored (only .worktrees/ was). The agent added '.claude/worktrees/' to .gitignore and committed it (8332f75) onto the hotfix branch — an unrequested extra commit polluting the hotfix diff. It disclosed this, but the harness arguably should ignore its own worktree dir by default.

**Kind:** ux
**Scenario:** worktree-creation-under-pressure
**Scenario Status:** pass

## Description

The native tool placed the worktree in .claude/worktrees/, which was NOT gitignored (only .worktrees/ was). The agent added '.claude/worktrees/' to .gitignore and committed it (8332f75) onto the hotfix branch — an unrequested extra commit polluting the hotfix diff. It disclosed this, but the harness arguably should ignore its own worktree dir by default.
