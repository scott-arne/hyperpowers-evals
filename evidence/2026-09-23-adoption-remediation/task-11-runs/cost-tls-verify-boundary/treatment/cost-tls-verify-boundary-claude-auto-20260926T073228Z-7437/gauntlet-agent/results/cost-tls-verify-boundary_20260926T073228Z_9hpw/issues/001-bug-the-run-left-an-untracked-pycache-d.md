# Bug: The run left an untracked __pycache__/ directory in the repo working tree (git status shows '?? __pycache__/'), a side effect of the agent's stubbed verification runs. Minor, but it dirties the repo.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

The run left an untracked __pycache__/ directory in the repo working tree (git status shows '?? __pycache__/'), a side effect of the agent's stubbed verification runs. Minor, but it dirties the repo.
