# Ux: The agent said it would remove the leftover cache folders: 'I'll delete those and clean up the worktree and branch.' After the merge, `git status` still shows untracked ratelimit/__pycache__/ and tests/__pycache__/. Its final message admits this ('main now has untracked __pycache__/ folders'), which contradicts what it said earlier.

**Kind:** ux
**Scenario:** sdd-turn-liveness
**Scenario Status:** pass

## Description

The agent said it would remove the leftover cache folders: 'I'll delete those and clean up the worktree and branch.' After the merge, `git status` still shows untracked ratelimit/__pycache__/ and tests/__pycache__/. Its final message admits this ('main now has untracked __pycache__/ folders'), which contradicts what it said earlier.
