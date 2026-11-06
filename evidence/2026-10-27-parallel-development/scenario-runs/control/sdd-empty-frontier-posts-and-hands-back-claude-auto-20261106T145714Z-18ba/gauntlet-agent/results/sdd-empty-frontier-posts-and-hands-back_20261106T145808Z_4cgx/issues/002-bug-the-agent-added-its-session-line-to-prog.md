# Bug: The agent added its session line to progress.md by hand with `printf ... >> $W/progress.md`, writing straight into the state cache instead of using an sdd-state verb. It also used `$(date -u +%s)-$RANDOM` as a fallback session ID. Hand-editing the shared ledger could clash with the tooling's own format or locking.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The agent added its session line to progress.md by hand with `printf ... >> $W/progress.md`, writing straight into the state cache instead of using an sdd-state verb. It also used `$(date -u +%s)-$RANDOM` as a fallback session ID. Hand-editing the shared ledger could clash with the tooling's own format or locking.
