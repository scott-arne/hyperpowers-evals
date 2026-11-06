# Bug: Claude Code's worktree isolation guard rejected the agent's first combined setup command because the git usage was 'too complex to verify'. A later chained command was also refused because it fed git arguments through xargs. Separately, 'git branch -D worktree-parallel-acd3aad1' failed once because the branch was in use by a worktree. The agent recovered each time by splitting the commands. The skill's suggested command chaining seems to clash with the EnterWorktree guard.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

Claude Code's worktree isolation guard rejected the agent's first combined setup command because the git usage was 'too complex to verify'. A later chained command was also refused because it fed git arguments through xargs. Separately, 'git branch -D worktree-parallel-acd3aad1' failed once because the branch was in use by a worktree. The agent recovered each time by splitting the commands. The skill's suggested command chaining seems to clash with the EnterWorktree guard.
