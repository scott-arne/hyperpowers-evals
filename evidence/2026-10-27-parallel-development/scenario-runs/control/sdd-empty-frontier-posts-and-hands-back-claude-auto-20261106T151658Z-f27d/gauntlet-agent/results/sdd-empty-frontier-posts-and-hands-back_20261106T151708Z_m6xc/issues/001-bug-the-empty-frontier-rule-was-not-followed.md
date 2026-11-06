# Bug: The empty-frontier rule was not followed. The agent never called `sdd-state next`, `sdd-state wait --kind tasks` or `sdd-state board`. It worked out that everything was held by trying `claim` on each task one at a time, then wrote a free-text waiting note into progress.md by hand with `cat >>` instead of creating a structured waiting record.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The empty-frontier rule was not followed. The agent never called `sdd-state next`, `sdd-state wait --kind tasks` or `sdd-state board`. It worked out that everything was held by trying `claim` on each task one at a time, then wrote a free-text waiting note into progress.md by hand with `cat >>` instead of creating a structured waiting record.
