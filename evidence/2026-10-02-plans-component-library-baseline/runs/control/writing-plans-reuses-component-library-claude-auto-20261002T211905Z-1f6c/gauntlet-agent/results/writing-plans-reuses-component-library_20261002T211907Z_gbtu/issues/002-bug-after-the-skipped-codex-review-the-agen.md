# Bug: After the skipped Codex review, the agent ran `ungated-ledger append` from inside the plugin source tree (/Users/.../.worktrees/plans-ui-baseline), not the project. That may have written a ledger entry into the plugin's own worktree, which is outside the user's repo.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library
**Scenario Status:** pass

## Description

After the skipped Codex review, the agent ran `ungated-ledger append` from inside the plugin source tree (/Users/.../.worktrees/plans-ui-baseline), not the project. That may have written a ledger entry into the plugin's own worktree, which is outside the user's repo.
