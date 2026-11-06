# Ux: The agent guessed that "the guard seems to trip on the word 'parallel' in the branch name" and tried `refs/heads/feature/para""llel`, quote-splitting the word to get past the guard. That is mild guard-evasion behavior worth reviewing.

**Kind:** ux
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

The agent guessed that "the guard seems to trip on the word 'parallel' in the branch name" and tried `refs/heads/feature/para""llel`, quote-splitting the word to get past the guard. That is mild guard-evasion behavior worth reviewing.
