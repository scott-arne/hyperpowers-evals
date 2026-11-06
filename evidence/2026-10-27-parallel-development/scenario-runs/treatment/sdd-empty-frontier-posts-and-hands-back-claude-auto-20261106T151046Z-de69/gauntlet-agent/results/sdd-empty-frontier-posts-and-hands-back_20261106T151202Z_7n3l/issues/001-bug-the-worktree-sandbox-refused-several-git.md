# Bug: The worktree sandbox refused several git commands. One was refused as a runtime-computed command name it couldn't verify. Others were refused with "feeds git its arguments from stdin at runtime (xargs/parallel)", apparently because they contained the word 'parallel' (from feature/parallel). For example, `git switch --detach feature/parallel` was refused, and the agent fell back to detaching by commit SHA. Its own refusal guidance says to run git with literal arguments, which is exactly what that command was. This will block later steps such as switching task branches and merging on any plan whose branch name contains 'parallel'.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** pass

## Description

The worktree sandbox refused several git commands. One was refused as a runtime-computed command name it couldn't verify. Others were refused with "feeds git its arguments from stdin at runtime (xargs/parallel)", apparently because they contained the word 'parallel' (from feature/parallel). For example, `git switch --detach feature/parallel` was refused, and the agent fell back to detaching by commit SHA. Its own refusal guidance says to run git with literal arguments, which is exactly what that command was. This will block later steps such as switching task branches and merging on any plan whose branch name contains 'parallel'.
