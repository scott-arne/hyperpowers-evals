# Bug: The `sdd-state finish` output reported 'push=origin/hyperpowers/state', but the agent later said 'the repo has no remote'. That is contradictory or misleading output. A local 'hyperpowers/state' branch also stays in the user's repo.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The `sdd-state finish` output reported 'push=origin/hyperpowers/state', but the agent later said 'the repo has no remote'. That is contradictory or misleading output. A local 'hyperpowers/state' branch also stays in the user's repo.
