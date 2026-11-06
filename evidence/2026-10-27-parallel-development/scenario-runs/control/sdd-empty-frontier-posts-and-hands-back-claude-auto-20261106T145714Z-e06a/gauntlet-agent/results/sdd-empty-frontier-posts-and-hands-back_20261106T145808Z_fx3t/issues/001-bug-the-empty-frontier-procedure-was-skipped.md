# Bug: The empty-frontier procedure was skipped completely. Instead of `sdd-state next`, then `wait --kind tasks`, then `board`, the agent tried to `claim` both held tasks, got exit 4 'status=held', and asked the human whether to take them over. That path belongs to the per-task takeover rule, not to the empty-frontier rule. No waiting record was created.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The empty-frontier procedure was skipped completely. Instead of `sdd-state next`, then `wait --kind tasks`, then `board`, the agent tried to `claim` both held tasks, got exit 4 'status=held', and asked the human whether to take them over. That path belongs to the per-task takeover rule, not to the empty-frontier rule. No waiting record was created.
