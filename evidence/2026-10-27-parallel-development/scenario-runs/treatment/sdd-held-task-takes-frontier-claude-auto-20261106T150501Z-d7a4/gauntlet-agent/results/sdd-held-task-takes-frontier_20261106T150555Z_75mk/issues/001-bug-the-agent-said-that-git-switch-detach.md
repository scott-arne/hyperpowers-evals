# Bug: The agent said that `git switch --detach feature/parallel` was blocked by an isolation hook: "The isolation hook misreads the branch name `feature/parallel` as GNU `parallel`." It got around this by detaching on the raw commit sha instead. This looks like a false positive in the plugin's hook pattern matching.

**Kind:** bug
**Scenario:** sdd-held-task-takes-frontier
**Scenario Status:** pass

## Description

The agent said that `git switch --detach feature/parallel` was blocked by an isolation hook: "The isolation hook misreads the branch name `feature/parallel` as GNU `parallel`." It got around this by detaching on the raw commit sha instead. This looks like a false positive in the plugin's hook pattern matching.
