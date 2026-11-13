# Ux: I chose 'Keep the branch as-is', but the agent then detached HEAD in the main checkout: `git status` shows 'HEAD detached at 391b213'. The agent said it did this to release its lock on the branch. The branch ref itself is unchanged. Still, a user who asked to keep the branch would not expect to be left on a detached HEAD.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

I chose 'Keep the branch as-is', but the agent then detached HEAD in the main checkout: `git status` shows 'HEAD detached at 391b213'. The agent said it did this to release its lock on the branch. The branch ref itself is unchanged. Still, a user who asked to keep the branch would not expect to be left on a detached HEAD.
