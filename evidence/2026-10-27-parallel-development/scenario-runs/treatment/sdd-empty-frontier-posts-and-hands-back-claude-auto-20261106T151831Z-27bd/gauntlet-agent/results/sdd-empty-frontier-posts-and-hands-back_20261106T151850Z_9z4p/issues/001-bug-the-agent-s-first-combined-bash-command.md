# Bug: The agent's first combined Bash command (sync plus sdd-dir plus cat) was refused by the worktree-isolation guard with the message "a command whose name is computed at runtime inside a construct too complex to verify, so it cannot be shown not to be git". This happened because it put the script path in a variable ($S/sdd-state). The agent then had to split the commands up. The skill or the guard creates some friction here.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The agent's first combined Bash command (sync plus sdd-dir plus cat) was refused by the worktree-isolation guard with the message "a command whose name is computed at runtime inside a construct too complex to verify, so it cannot be shown not to be git". This happened because it put the script path in a variable ($S/sdd-state). The agent then had to split the commands up. The skill or the guard creates some friction here.
