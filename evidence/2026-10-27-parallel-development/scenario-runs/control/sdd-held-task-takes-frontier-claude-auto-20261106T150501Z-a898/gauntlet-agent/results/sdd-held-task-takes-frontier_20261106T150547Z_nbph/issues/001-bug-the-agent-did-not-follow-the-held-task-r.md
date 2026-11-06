# Bug: The agent did not follow the held-task rule. Instead of running `sdd-state register` and `next`, it tried to claim Task 1 directly ("Now I'll try claiming Task 1, which the skill requires before anything else"). When the claim failed because the task was held, it stopped and asked the developer to pick a task. It never took Task 2, which was independent and claimable.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The agent did not follow the held-task rule. Instead of running `sdd-state register` and `next`, it tried to claim Task 1 directly ("Now I'll try claiming Task 1, which the skill requires before anything else"). When the claim failed because the task was held, it stopped and asked the developer to pick a task. It never took Task 2, which was independent and claimable.
