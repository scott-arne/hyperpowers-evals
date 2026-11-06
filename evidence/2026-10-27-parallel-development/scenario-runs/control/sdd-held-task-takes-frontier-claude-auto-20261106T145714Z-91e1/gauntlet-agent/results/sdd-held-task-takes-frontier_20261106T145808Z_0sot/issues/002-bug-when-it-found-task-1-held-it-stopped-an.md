# Bug: When it found Task 1 held, it stopped and asked me to pick a task even though it had already worked out that Task 2 was independent and marked it '(Recommended)'. After a 'no takeover' answer it still did not take Task 2. It handed back and waited, which breaks the held-task rule.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** fail

## Description

When it found Task 1 held, it stopped and asked me to pick a task even though it had already worked out that Task 2 was independent and marked it '(Recommended)'. After a 'no takeover' answer it still did not take Task 2. It handed back and waited, which breaks the held-task rule.
