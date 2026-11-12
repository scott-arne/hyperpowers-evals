# Ux: I chose 'Keep the branch as-is', but the agent left the checkout on a detached HEAD at 99e5006 instead of on feature/textstats (`git status`: 'HEAD detached at 99e5006'). It did mention this and gave `git switch feature/textstats` as the fix, but a user who says 'keep as-is' would probably not expect their checkout to change.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

I chose 'Keep the branch as-is', but the agent left the checkout on a detached HEAD at 99e5006 instead of on feature/textstats (`git status`: 'HEAD detached at 99e5006'). It did mention this and gave `git switch feature/textstats` as the fix, but a user who says 'keep as-is' would probably not expect their checkout to change.
