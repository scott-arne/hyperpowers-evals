# Bug: Claude Code's worktree safety guard seems to treat the word 'parallel' in the branch name feature/parallel as the GNU `parallel` tool. It blocked git commands such as `git switch --detach feature/parallel`, and the agent had to detach by SHA (46be16d) instead. Several compound commands were also refused as 'too complex to verify', so the agent re-ran register/verify/deps/next as separate commands.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

Claude Code's worktree safety guard seems to treat the word 'parallel' in the branch name feature/parallel as the GNU `parallel` tool. It blocked git commands such as `git switch --detach feature/parallel`, and the agent had to detach by SHA (46be16d) instead. Several compound commands were also refused as 'too complex to verify', so the agent re-ran register/verify/deps/next as separate commands.
