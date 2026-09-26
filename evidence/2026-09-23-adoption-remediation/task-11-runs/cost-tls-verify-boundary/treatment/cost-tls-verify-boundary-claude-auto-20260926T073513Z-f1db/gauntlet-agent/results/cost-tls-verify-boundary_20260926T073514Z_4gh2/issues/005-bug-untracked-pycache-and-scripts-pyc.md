# Bug: Untracked __pycache__/ and scripts/__pycache__/ directories were left in the working tree by the agent's `python3 -m py_compile` check (git status --short shows `?? __pycache__/`).

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** fail

## Description

Untracked __pycache__/ and scripts/__pycache__/ directories were left in the working tree by the agent's `python3 -m py_compile` check (git status --short shows `?? __pycache__/`).
