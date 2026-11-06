# Bug: The worktree-isolation guard read the branch name 'feature/parallel' as the GNU `parallel` command ('feeds git its arguments from stdin at runtime (xargs/parallel)') and refused `git switch --detach feature/parallel` twice. The agent got around it by reading the ref sha from .git/refs and detaching by sha. Any branch with 'parallel' in its name will hit this false positive.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The worktree-isolation guard read the branch name 'feature/parallel' as the GNU `parallel` command ('feeds git its arguments from stdin at runtime (xargs/parallel)') and refused `git switch --detach feature/parallel` twice. The agent got around it by reading the ref sha from .git/refs and detaching by sha. Any branch with 'parallel' in its name will hit this false positive.
