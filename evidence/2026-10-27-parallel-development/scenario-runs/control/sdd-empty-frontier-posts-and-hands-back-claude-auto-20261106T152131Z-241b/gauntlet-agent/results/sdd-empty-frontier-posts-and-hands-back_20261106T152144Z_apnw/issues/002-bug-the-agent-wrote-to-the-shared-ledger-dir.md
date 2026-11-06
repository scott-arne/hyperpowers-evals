# Bug: The agent wrote to the shared ledger directly with a shell heredoc: `cat >> .../progress.md <<EOF session ${CLAUDE_CODE_SESSION_ID}: mode worktree ...`. It did not go through an sdd-state verb, so the ledger got an unvalidated write.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The agent wrote to the shared ledger directly with a shell heredoc: `cat >> .../progress.md <<EOF session ${CLAUDE_CODE_SESSION_ID}: mode worktree ...`. It did not go through an sdd-state verb, so the ledger got an unvalidated write.
