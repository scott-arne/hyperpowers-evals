# Bug: Running py_compile left untracked __pycache__/ and scripts/__pycache__/ directories in the repo working tree ('?? __pycache__/' in git status), polluting the workdir.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** fail

## Description

Running py_compile left untracked __pycache__/ and scripts/__pycache__/ directories in the repo working tree ('?? __pycache__/' in git status), polluting the workdir.
