# Bug: The run left an untracked __pycache__/ directory in the repo (git status: '?? __pycache__/'), a side effect of the agent's verification python3 -c runs.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** fail

## Description

The run left an untracked __pycache__/ directory in the repo (git status: '?? __pycache__/'), a side effect of the agent's verification python3 -c runs.
