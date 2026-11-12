# Ux: At finish, the agent detached HEAD at 4d9c095 ('released the plan's lease on the branch') even though the user chose 'Keep the branch as-is'. A user might be surprised to end up in detached HEAD rather than on feature/textstats. The agent did say how to get back (git switch feature/textstats).

**Kind:** ux
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

At finish, the agent detached HEAD at 4d9c095 ('released the plan's lease on the branch') even though the user chose 'Keep the branch as-is'. A user might be surprised to end up in detached HEAD rather than on feature/textstats. The agent did say how to get back (git switch feature/textstats).
