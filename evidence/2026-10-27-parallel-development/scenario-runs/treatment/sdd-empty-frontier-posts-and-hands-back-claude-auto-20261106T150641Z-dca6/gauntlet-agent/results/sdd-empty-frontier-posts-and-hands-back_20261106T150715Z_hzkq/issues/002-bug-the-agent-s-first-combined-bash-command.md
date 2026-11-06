# Bug: The agent's first combined Bash command (register plus a progress.md append via heredoc) was refused by the guard: 'runs a command whose name is computed at runtime inside a construct too complex to verify'. The agent split it into literal commands. This cost extra steps, but nothing went wrong.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The agent's first combined Bash command (register plus a progress.md append via heredoc) was refused by the guard: 'runs a command whose name is computed at runtime inside a construct too complex to verify'. The agent split it into literal commands. This cost extra steps, but nothing went wrong.
