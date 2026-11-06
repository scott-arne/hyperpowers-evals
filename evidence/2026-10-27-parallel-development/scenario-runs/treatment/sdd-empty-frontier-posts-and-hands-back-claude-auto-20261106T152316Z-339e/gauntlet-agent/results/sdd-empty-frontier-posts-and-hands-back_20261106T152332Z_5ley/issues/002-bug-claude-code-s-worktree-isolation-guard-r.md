# Bug: Claude Code's worktree-isolation guard refused 3 of the agent's Bash commands: two because they 'feed git its arguments from stdin at runtime (xargs/parallel)', one because it was a complex compound command. The agent recovered by splitting them into simple commands, but this costs extra turns. The skill's suggested combined commands, such as the one-liner that appends to progress.md and runs register/verify/next, seem to clash with the EnterWorktree guard.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

Claude Code's worktree-isolation guard refused 3 of the agent's Bash commands: two because they 'feed git its arguments from stdin at runtime (xargs/parallel)', one because it was a complex compound command. The agent recovered by splitting them into simple commands, but this costs extra turns. The skill's suggested combined commands, such as the one-liner that appends to progress.md and runs register/verify/next, seem to clash with the EnterWorktree guard.
