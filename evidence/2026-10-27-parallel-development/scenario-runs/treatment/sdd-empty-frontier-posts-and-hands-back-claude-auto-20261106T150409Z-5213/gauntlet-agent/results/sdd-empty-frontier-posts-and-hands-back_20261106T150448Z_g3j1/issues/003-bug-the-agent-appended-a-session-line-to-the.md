# Bug: The agent appended a session line to the progress.md ledger with a hand-written heredoc instead of a script verb. The line carries a made-up timestamp, 'started 2026-11-06T15:10:00Z', which was a few minutes in the future when it was written (the waiting record shows 15:06:49Z).

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The agent appended a session line to the progress.md ledger with a hand-written heredoc instead of a script verb. The line carries a made-up timestamp, 'started 2026-11-06T15:10:00Z', which was a few minutes in the future when it was written (the waiting record shows 15:06:49Z).
