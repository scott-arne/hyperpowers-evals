# Bug: Needs investigation: the `sdd-state finish` output says 'push=origin/hyperpowers/state', but `git remote -v` shows no remotes in the repo. A 'hyperpowers/state' branch is checked out as a separate worktree under the throwaway home's .cache. Someone should check what 'push' means when there is no origin.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

Needs investigation: the `sdd-state finish` output says 'push=origin/hyperpowers/state', but `git remote -v` shows no remotes in the repo. A 'hyperpowers/state' branch is checked out as a separate worktree under the throwaway home's .cache. Someone should check what 'push' means when there is no origin.
