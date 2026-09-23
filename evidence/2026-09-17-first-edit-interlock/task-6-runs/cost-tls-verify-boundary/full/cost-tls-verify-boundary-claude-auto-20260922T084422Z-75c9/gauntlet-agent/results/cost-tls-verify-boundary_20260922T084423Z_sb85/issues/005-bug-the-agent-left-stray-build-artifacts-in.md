# Bug: The agent left stray build artifacts in the working tree: git status shows untracked "__pycache__/" and "scripts/__pycache__/" created by its `python3 -m py_compile` verification step.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** fail

## Description

The agent left stray build artifacts in the working tree: git status shows untracked "__pycache__/" and "scripts/__pycache__/" created by its `python3 -m py_compile` verification step.
