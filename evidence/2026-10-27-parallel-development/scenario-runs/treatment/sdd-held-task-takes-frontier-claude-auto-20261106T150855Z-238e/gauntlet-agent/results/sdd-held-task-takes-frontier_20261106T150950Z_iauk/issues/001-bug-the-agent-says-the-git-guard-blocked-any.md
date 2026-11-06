# Bug: The agent says the git guard blocked any command containing the branch name `feature/parallel`, mistaking "parallel" for GNU parallel. To get around it, the agent passed raw commit ids to git (e.g. `git switch --detach 5683d02…`) after `git switch --detach feature/parallel` failed several times. This false positive is likely to affect real users with similar branch names.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

The agent says the git guard blocked any command containing the branch name `feature/parallel`, mistaking "parallel" for GNU parallel. To get around it, the agent passed raw commit ids to git (e.g. `git switch --detach 5683d02…`) after `git switch --detach feature/parallel` failed several times. This false positive is likely to affect real users with similar branch names.
