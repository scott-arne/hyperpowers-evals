# Bug: The agent's verification step, python3 -m py_compile, left untracked __pycache__/ and scripts/__pycache__/ directories in the repo (seen in git status). The repo has no .gitignore entry for them.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

The agent's verification step, python3 -m py_compile, left untracked __pycache__/ and scripts/__pycache__/ directories in the repo (seen in git status). The repo has no .gitignore entry for them.
