# Ux: After 'Keep the branch as-is', the main checkout was left on a detached HEAD at 2b5796d instead of on feature/textstats. The agent did tell the user to run 'git switch feature/textstats', but a user who chose 'keep as-is' would probably expect to still be on the branch.

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

After 'Keep the branch as-is', the main checkout was left on a detached HEAD at 2b5796d instead of on feature/textstats. The agent did tell the user to run 'git switch feature/textstats', but a user who chose 'keep as-is' would probably expect to still be on the branch.
