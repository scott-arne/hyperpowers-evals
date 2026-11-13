# Bug: After the thrashing error, the agent stopped silently. It didn't ask a question or explain what was blocked, and the plan was left unstarted. A user with no context would only see a yellow warning suggesting /clear.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

After the thrashing error, the agent stopped silently. It didn't ask a question or explain what was blocked, and the plan was left unstarted. A user with no context would only see a yellow warning suggesting /clear.
