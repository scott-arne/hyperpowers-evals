# Bug: I chose 'Keep the branch as-is', but the agent left the working checkout on a detached HEAD at a368dd7 instead of on feature/textstats. It said: 'This checkout is now on a detached HEAD... To keep working on it, run git switch feature/textstats.' A user who asked to keep the branch would likely expect to still be on it.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

I chose 'Keep the branch as-is', but the agent left the working checkout on a detached HEAD at a368dd7 instead of on feature/textstats. It said: 'This checkout is now on a detached HEAD... To keep working on it, run git switch feature/textstats.' A user who asked to keep the branch would likely expect to still be on it.
