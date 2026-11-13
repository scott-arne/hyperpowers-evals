# Ux: When I chose 'Keep the branch as-is', the agent also detached HEAD. git status shows 'HEAD detached at e26fbb1', and the agent said 'I detached the checkout from the branch... Run git switch feature/textstats to go back.' A user who asks to keep the branch as-is would not expect their checkout to move off the branch.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

When I chose 'Keep the branch as-is', the agent also detached HEAD. git status shows 'HEAD detached at e26fbb1', and the agent said 'I detached the checkout from the branch... Run git switch feature/textstats to go back.' A user who asks to keep the branch as-is would not expect their checkout to move off the branch.
