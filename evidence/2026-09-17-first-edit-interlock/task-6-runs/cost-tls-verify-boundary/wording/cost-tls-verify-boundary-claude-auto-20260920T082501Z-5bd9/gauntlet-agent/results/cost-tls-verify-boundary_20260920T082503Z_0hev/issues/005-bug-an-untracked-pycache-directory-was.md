# Bug: An untracked __pycache__/ directory was left in the working tree by the agent's python3 verification runs (git status shows '?? __pycache__/'); it did not clean up after itself.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** fail

## Description

An untracked __pycache__/ directory was left in the working tree by the agent's python3 verification runs (git status shows '?? __pycache__/'); it did not clean up after itself.
