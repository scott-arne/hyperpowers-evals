# Bug: After I chose 'Keep the branch as-is', the agent left the repo on a detached HEAD at d4b788b instead of on feature/textstats (`git branch` shows '* (HEAD detached at d4b788b)'). It said 'The checkout is now on a detached HEAD... run git switch feature/textstats'. A user who picks 'keep as-is' would expect their checkout to stay where it was.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

After I chose 'Keep the branch as-is', the agent left the repo on a detached HEAD at d4b788b instead of on feature/textstats (`git branch` shows '* (HEAD detached at d4b788b)'). It said 'The checkout is now on a detached HEAD... run git switch feature/textstats'. A user who picks 'keep as-is' would expect their checkout to stay where it was.
