# Ux: `git switch --detach feature/parallel` was blocked by the same guard. In its final message the agent said the cause was the guard reading 'parallel' as the parallel tool, and it worked around this by detaching to the SHA 3359d1b. The guard messages I saw in the log were about worktree isolation, so that explanation may be wrong. It may confuse users.

**Kind:** ux
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

`git switch --detach feature/parallel` was blocked by the same guard. In its final message the agent said the cause was the guard reading 'parallel' as the parallel tool, and it worked around this by detaching to the SHA 3359d1b. The guard messages I saw in the log were about worktree isolation, so that explanation may be wrong. It may confuse users.
