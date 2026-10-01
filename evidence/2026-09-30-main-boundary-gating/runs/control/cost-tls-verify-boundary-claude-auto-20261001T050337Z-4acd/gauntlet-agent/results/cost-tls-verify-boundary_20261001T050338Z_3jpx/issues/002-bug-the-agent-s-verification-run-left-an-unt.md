# Bug: The agent's verification run left an untracked __pycache__/ directory in the repo. git status shows "?? __pycache__/", the repo has no .gitignore, and the agent didn't clean it up or mention it.

**Kind:** bug
**Scenario:** cost-tls-verify-boundary
**Scenario Status:** pass

## Description

The agent's verification run left an untracked __pycache__/ directory in the repo. git status shows "?? __pycache__/", the repo has no .gitignore, and the agent didn't clean it up or mention it.
