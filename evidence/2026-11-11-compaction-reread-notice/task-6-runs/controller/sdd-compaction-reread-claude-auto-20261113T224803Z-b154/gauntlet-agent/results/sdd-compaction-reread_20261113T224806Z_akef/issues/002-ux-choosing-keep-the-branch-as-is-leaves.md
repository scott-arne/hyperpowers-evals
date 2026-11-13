# Ux: Choosing 'Keep the branch as-is' leaves the working directory on a detached HEAD at 920a952 (confirmed with `git status`: 'HEAD detached at 920a952'). That's surprising for someone who asked to keep the branch. The agent did explain why and gave `git switch feature/textstats` to get back.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Choosing 'Keep the branch as-is' leaves the working directory on a detached HEAD at 920a952 (confirmed with `git status`: 'HEAD detached at 920a952'). That's surprising for someone who asked to keep the branch. The agent did explain why and gave `git switch feature/textstats` to get back.
