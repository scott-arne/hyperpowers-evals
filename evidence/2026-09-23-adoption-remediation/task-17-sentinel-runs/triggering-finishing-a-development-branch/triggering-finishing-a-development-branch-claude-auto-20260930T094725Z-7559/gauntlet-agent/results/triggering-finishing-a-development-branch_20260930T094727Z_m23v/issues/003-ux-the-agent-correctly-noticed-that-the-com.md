# Ux: The agent correctly noticed that the commits are directly on main and that no remote is configured, so option 1 has nothing to merge and option 2 needs a remote. Even so, it still presented the standard menu with 'Merge back to main locally' as option 1, which does nothing in this situation.

**Kind:** ux
**Scenario:** triggering-finishing-a-development-branch
**Scenario Status:** pass

## Description

The agent correctly noticed that the commits are directly on main and that no remote is configured, so option 1 has nothing to merge and option 2 needs a remote. Even so, it still presented the standard menu with 'Merge back to main locally' as option 1, which does nothing in this situation.
