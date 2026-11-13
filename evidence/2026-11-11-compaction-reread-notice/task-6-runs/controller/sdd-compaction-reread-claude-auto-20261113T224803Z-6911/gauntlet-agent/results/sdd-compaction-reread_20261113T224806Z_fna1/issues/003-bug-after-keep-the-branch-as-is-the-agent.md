# Bug: After 'Keep the branch as-is', the agent left the checkout on a detached HEAD at 26e52e8 instead of on feature/textstats. It also created an extra 'hyperpowers/state' branch, which git branch lists with a '+' (checked out in another worktree). That is surprising for 'keep as-is'. The agent did say this and gave the commands to switch back.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

After 'Keep the branch as-is', the agent left the checkout on a detached HEAD at 26e52e8 instead of on feature/textstats. It also created an extra 'hyperpowers/state' branch, which git branch lists with a '+' (checked out in another worktree). That is surprising for 'keep as-is'. The agent did say this and gave the commands to switch back.
