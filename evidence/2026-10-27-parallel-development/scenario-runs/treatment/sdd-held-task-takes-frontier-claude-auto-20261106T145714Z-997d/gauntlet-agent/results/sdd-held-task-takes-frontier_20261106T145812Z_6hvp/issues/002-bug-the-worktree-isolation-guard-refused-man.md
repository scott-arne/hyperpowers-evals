# Bug: The worktree isolation guard refused many ordinary commands: chained `git switch --detach feature/parallel && ...`, `git checkout --detach feature/parallel`, and printf/cat heredocs (messages like "feeds git its arguments from stdin at runtime (xargs/parallel)" and "construct too complex to verify"). The word "parallel" in the branch name appears to trip the xargs/parallel check. The agent worked around it by detaching to the commit SHA and splitting commands up, which cost time.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

The worktree isolation guard refused many ordinary commands: chained `git switch --detach feature/parallel && ...`, `git checkout --detach feature/parallel`, and printf/cat heredocs (messages like "feeds git its arguments from stdin at runtime (xargs/parallel)" and "construct too complex to verify"). The word "parallel" in the branch name appears to trip the xargs/parallel check. The agent worked around it by detaching to the commit SHA and splitting commands up, which cost time.
