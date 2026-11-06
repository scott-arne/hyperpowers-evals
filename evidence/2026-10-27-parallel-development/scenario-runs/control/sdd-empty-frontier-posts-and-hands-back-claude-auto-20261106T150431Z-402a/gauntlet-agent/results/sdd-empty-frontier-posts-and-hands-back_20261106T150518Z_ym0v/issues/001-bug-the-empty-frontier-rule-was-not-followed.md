# Bug: The empty-frontier rule was not followed. The agent never called `sdd-state next`; it ran `sdd-state claim` directly on each task number. After both came back held, it posted no waiting record and printed no board. Instead it asked the developer an AskUserQuestion about whether to take over, so the hand-back depended on a question to the developer rather than the skill's waiting-record protocol.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The empty-frontier rule was not followed. The agent never called `sdd-state next`; it ran `sdd-state claim` directly on each task number. After both came back held, it posted no waiting record and printed no board. Instead it asked the developer an AskUserQuestion about whether to take over, so the hand-back depended on a question to the developer rather than the skill's waiting-record protocol.
