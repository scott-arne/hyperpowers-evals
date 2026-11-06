# Bug: The agent wrote its session line and its 'waiting' note into progress.md by hand with `printf >>`, not through sdd-state verbs. As a result there is no structured waiting record, and nothing exists under a waiting/ directory.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The agent wrote its session line and its 'waiting' note into progress.md by hand with `printf >>`, not through sdd-state verbs. As a result there is no structured waiting record, and nothing exists under a waiting/ directory.
