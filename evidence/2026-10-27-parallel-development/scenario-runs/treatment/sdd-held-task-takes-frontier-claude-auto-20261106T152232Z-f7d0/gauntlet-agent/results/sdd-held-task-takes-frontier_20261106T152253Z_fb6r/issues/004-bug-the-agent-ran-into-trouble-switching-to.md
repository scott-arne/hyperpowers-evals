# Bug: The agent ran into trouble switching to feature/parallel: `git switch --detach feature/parallel` was run twice, then it tried `git rev-parse refs/heads/feature/para""llel`, ran for-each-ref, and finally switched to the commit SHA. Something about that branch name or its state likely blocked a plain switch. It recovered, but the engineer should look into why.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

The agent ran into trouble switching to feature/parallel: `git switch --detach feature/parallel` was run twice, then it tried `git rev-parse refs/heads/feature/para""llel`, ran for-each-ref, and finally switched to the commit SHA. Something about that branch name or its state likely blocked a plain switch. It recovered, but the engineer should look into why.
