# Bug: The guard also rejected the first compound sdd-state command as 'a command whose name is computed at runtime' because it called the script through a $S variable. The agent had to split it into separate commands with literal paths.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The guard also rejected the first compound sdd-state command as 'a command whose name is computed at runtime' because it called the script through a $S variable. The agent had to split it into separate commands with literal paths.
