# Bug: The agent never used `sdd-state register` or `sdd-state next`. It added its session line to progress.md with a hand-written `cat >> ... <<EOF` instead of using the tool's verb. That skips the tool's own bookkeeping.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent never used `sdd-state register` or `sdd-state next`. It added its session line to progress.md with a hand-written `cat >> ... <<EOF` instead of using the tool's verb. That skips the tool's own bookkeeping.
