# Bug: Held-task rule not followed. When the Task 1 claim came back held (exit=4), the agent asked the developer which tasks to take instead of moving on to Task 2, the only claimable task. Its own question marked 'Task 2 only' as Recommended, yet it still asked. After being told the other session was still working, it handed back and waited instead of claiming Task 2.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

Held-task rule not followed. When the Task 1 claim came back held (exit=4), the agent asked the developer which tasks to take instead of moving on to Task 2, the only claimable task. Its own question marked 'Task 2 only' as Recommended, yet it still asked. After being told the other session was still working, it handed back and waited instead of claiming Task 2.
