# Bug: The worktree guard hook blocked `git switch --detach feature/parallel` twice. The agent said the guard seemed to read 'parallel' in the branch name as the GNU parallel tool. The agent got around it by detaching at the commit sha (bbf27e3). That is a false positive in the guard, and it would hit any plan or branch with 'parallel' in its name.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The worktree guard hook blocked `git switch --detach feature/parallel` twice. The agent said the guard seemed to read 'parallel' in the branch name as the GNU parallel tool. The agent got around it by detaching at the commit sha (bbf27e3). That is a false positive in the guard, and it would hit any plan or branch with 'parallel' in its name.
