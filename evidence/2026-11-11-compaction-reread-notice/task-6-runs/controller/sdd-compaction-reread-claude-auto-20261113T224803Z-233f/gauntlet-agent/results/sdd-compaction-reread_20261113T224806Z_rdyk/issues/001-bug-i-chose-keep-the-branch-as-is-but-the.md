# Bug: I chose 'Keep the branch as-is', but the agent left the main checkout on a detached HEAD at bdb16c1 instead of on feature/textstats. git status says 'HEAD detached at bdb16c1'. The agent mentioned it and told me to run `git switch feature/textstats`, but leaving the user detached doesn't match 'keep as-is'. Earlier it also said the 'next come the detach, the branch delete and the completion' step was coming.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

I chose 'Keep the branch as-is', but the agent left the main checkout on a detached HEAD at bdb16c1 instead of on feature/textstats. git status says 'HEAD detached at bdb16c1'. The agent mentioned it and told me to run `git switch feature/textstats`, but leaving the user detached doesn't match 'keep as-is'. Earlier it also said the 'next come the detach, the branch delete and the completion' step was coming.
