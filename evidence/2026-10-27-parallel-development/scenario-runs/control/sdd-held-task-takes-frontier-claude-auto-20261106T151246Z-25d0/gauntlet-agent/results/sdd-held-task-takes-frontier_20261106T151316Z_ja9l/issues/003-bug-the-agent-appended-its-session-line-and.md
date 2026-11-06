# Bug: The agent appended its session line and pre-flight scan to the shared progress.md by hand, with `cat >> ... <<EOF`, instead of through sdd-state. It also used a made-up timestamp, `started 2026-11-06T15:20:00Z`.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent appended its session line and pre-flight scan to the shared progress.md by hand, with `cat >> ... <<EOF`, instead of through sdd-state. It also used a made-up timestamp, `started 2026-11-06T15:20:00Z`.
