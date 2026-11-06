# Bug: The agent wrote its own session line into the ledger by hand: `printf 'session %s: mode worktree ...' >> $W/progress.md` straight into the cache state dir. Either the skill tells it to append the ledger by hand, or there is no sdd-state verb for this and the agent improvised. Worth checking.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The agent wrote its own session line into the ledger by hand: `printf 'session %s: mode worktree ...' >> $W/progress.md` straight into the cache state dir. Either the skill tells it to append the ledger by hand, or there is no sdd-state verb for this and the agent improvised. Worth checking.
