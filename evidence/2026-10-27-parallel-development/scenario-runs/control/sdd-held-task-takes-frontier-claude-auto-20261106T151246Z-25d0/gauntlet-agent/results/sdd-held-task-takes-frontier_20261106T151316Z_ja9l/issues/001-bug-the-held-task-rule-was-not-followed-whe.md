# Bug: The held-task rule was not followed. When Task 1 came back held (exit=4), the agent did not move on to the claimable Task 2. It stopped and asked the developer, saying "The skill won't let me jump ahead to another task without your say-so." Either the skill text tells it to stop on a held task, or the agent misread it.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

The held-task rule was not followed. When Task 1 came back held (exit=4), the agent did not move on to the claimable Task 2. It stopped and asked the developer, saying "The skill won't let me jump ahead to another task without your say-so." Either the skill text tells it to stop on a held task, or the agent misread it.
