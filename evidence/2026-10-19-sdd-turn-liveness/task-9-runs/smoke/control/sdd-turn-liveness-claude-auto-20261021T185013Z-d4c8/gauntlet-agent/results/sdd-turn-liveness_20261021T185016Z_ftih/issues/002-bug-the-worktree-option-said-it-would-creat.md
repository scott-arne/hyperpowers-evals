# Bug: The worktree option said it would 'Create .worktrees/ratelimit on a new branch `ratelimit`'. The actual worktree was .claude/worktrees/ratelimit on branch 'worktree-ratelimit' (the session log path was ...-claude-worktrees-ratelimi-qawj5u). The agent admitted it left the worktree and branch in place because 'Claude Code created that worktree'. As a result, main has an untracked .claude/ directory after the merge.

**Kind:** bug
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The worktree option said it would 'Create .worktrees/ratelimit on a new branch `ratelimit`'. The actual worktree was .claude/worktrees/ratelimit on branch 'worktree-ratelimit' (the session log path was ...-claude-worktrees-ratelimi-qawj5u). The agent admitted it left the worktree and branch in place because 'Claude Code created that worktree'. As a result, main has an untracked .claude/ directory after the merge.
