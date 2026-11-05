# Ux: The finish output says 'push=origin/hyperpowers/state', but the repo has no remote (`git remote -v` prints nothing). A local `hyperpowers/state` branch exists, marked '+' in `git branch -a`. The 'push=origin/...' wording is misleading when there's no origin.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The finish output says 'push=origin/hyperpowers/state', but the repo has no remote (`git remote -v` prints nothing). A local `hyperpowers/state` branch exists, marked '+' in `git branch -a`. The 'push=origin/...' wording is misleading when there's no origin.
