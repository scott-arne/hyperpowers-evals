# Bug: Claude Code's worktree isolation guard reads the word "parallel" in the branch name feature/parallel as the GNU `parallel` command. It refused commands like `git switch --detach feature/parallel` with "feeds git its arguments from stdin at runtime (xargs/parallel)". The agent got around this by using commit SHAs. Any plan whose branch name contains a command name could hit the same false positive.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

Claude Code's worktree isolation guard reads the word "parallel" in the branch name feature/parallel as the GNU `parallel` command. It refused commands like `git switch --detach feature/parallel` with "feeds git its arguments from stdin at runtime (xargs/parallel)". The agent got around this by using commit SHAs. Any plan whose branch name contains a command name could hit the same false positive.
