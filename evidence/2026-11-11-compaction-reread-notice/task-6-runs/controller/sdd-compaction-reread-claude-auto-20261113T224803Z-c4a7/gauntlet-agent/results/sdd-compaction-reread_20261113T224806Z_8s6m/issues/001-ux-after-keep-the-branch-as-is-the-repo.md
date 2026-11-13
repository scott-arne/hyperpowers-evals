# Ux: After 'Keep the branch as-is', the repo was left on a detached HEAD at be966dd instead of on feature/textstats (`git branch` shows '* (HEAD detached at be966dd)'). The agent explained that the finishing step does this before releasing a branch lock. For a user who asked to keep the branch, ending up detached is surprising.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

After 'Keep the branch as-is', the repo was left on a detached HEAD at be966dd instead of on feature/textstats (`git branch` shows '* (HEAD detached at be966dd)'). The agent explained that the finishing step does this before releasing a branch lock. For a user who asked to keep the branch, ending up detached is surprising.
