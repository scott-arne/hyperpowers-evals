# Bug: I chose 'Keep the branch as-is', but the agent also detached HEAD: `git branch -a` shows `* (HEAD detached at e095429)`. It said 'Detached the checkout… Run git switch feature/textstats to go back'. A user who asks to keep the branch as-is would not expect their working checkout to be taken off the branch.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

I chose 'Keep the branch as-is', but the agent also detached HEAD: `git branch -a` shows `* (HEAD detached at e095429)`. It said 'Detached the checkout… Run git switch feature/textstats to go back'. A user who asks to keep the branch as-is would not expect their working checkout to be taken off the branch.
