# Bug: The start-server.sh call ran from a path under the host's .worktrees/companion-baseline plugin directory. That is fine for this run, but the companion depends on scripts outside the repo.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-default-window
**Scenario Status:** pass

## Description

The start-server.sh call ran from a path under the host's .worktrees/companion-baseline plugin directory. That is fine for this run, but the companion depends on scripts outside the repo.
