# Bug: The agent appended a session line to progress.md by hand with a `cat >> $W/progress.md` heredoc, writing straight into the cache state directory instead of using an sdd-state verb. If the skill expects state changes to go through sdd-state, this bypasses it.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The agent appended a session line to progress.md by hand with a `cat >> $W/progress.md` heredoc, writing straight into the cache state directory instead of using an sdd-state verb. If the skill expects state changes to go through sdd-state, this bypasses it.
