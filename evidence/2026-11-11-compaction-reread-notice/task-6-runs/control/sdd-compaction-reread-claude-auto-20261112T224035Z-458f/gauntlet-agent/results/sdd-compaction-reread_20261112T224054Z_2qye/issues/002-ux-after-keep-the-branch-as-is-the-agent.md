# Ux: After 'Keep the branch as-is', the agent left the checkout on a detached HEAD at 2281df9 and told the user to run `git switch feature/textstats`. A user who asked to keep the branch as it is would probably not expect their checkout to end up detached.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

After 'Keep the branch as-is', the agent left the checkout on a detached HEAD at 2281df9 and told the user to run `git switch feature/textstats`. A user who asked to keep the branch as it is would probably not expect their checkout to end up detached.
