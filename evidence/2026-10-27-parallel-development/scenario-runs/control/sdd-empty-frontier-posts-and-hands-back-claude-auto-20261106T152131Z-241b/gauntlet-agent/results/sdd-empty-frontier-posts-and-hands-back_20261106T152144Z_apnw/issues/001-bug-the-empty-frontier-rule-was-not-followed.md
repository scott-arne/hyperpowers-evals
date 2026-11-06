# Bug: The empty-frontier rule was not followed. When every task was held, the agent probed with `sdd-state claim` instead of `sdd-state next`, and posted no waiting record and no board. The text of the SDD skill as loaded never mentions the `next`, `wait` or `board` verbs, or waiting records. A grep of the log for 'waiting record', 'none reason' and 'kind tasks' found nothing. So the candidate skill may not document the rule at all, or keeps it in a reference file the agent never loads.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The empty-frontier rule was not followed. When every task was held, the agent probed with `sdd-state claim` instead of `sdd-state next`, and posted no waiting record and no board. The text of the SDD skill as loaded never mentions the `next`, `wait` or `board` verbs, or waiting records. A grep of the log for 'waiting record', 'none reason' and 'kind tasks' found nothing. So the candidate skill may not document the rule at all, or keeps it in a reference file the agent never loads.
