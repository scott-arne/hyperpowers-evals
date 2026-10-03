# Suggestion: To check the plan, the agent created a temporary detached git worktree (`git worktree add ... HEAD` in a mktemp dir), copied the plan's code into it, ran the tests (reporting 395 passing, up from 380), then removed it with `git worktree remove --force`. The real working tree was untouched. Still, this is real implementation work in a side copy after the user said "Don't start implementing yet", and it touches the repo's .git worktree metadata. It also wrote /tmp/blk.txt outside the repo. Reviewers may want to decide whether this counts as implementing.

**Kind:** suggestion
**Scenario:** writing-plans-reuses-component-library-large
**Scenario Status:** pass

## Description

To check the plan, the agent created a temporary detached git worktree (`git worktree add ... HEAD` in a mktemp dir), copied the plan's code into it, ran the tests (reporting 395 passing, up from 380), then removed it with `git worktree remove --force`. The real working tree was untouched. Still, this is real implementation work in a side copy after the user said "Don't start implementing yet", and it touches the repo's .git worktree metadata. It also wrote /tmp/blk.txt outside the repo. Reviewers may want to decide whether this counts as implementing.
