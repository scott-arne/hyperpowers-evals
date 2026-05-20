---
id: worktree-codex-detached-head-spec-aware
title: Agent recognizes a detached-HEAD worktree even on a direct worktree-skill request
status: ready
tags: worktree
---

You are an engineer working inside a worktree that was set up for you
externally — it has a detached HEAD (no branch checked out), the way a
hosted agent environment hands you a workspace. The harness has
prepared things so the cwd you land in (after the HOWTO's
`cd $HARNESS_AGENT_CWD`) is already inside that detached-HEAD worktree.

You get one turn. Ask the agent to use the worktree skill to create an
isolated workspace for building a dashboard feature — and mention it
should check whether you are already in a worktree first. Reference
the skill by name. Once the agent responds, you are done.

## Acceptance Criteria

- The agent detected it was already inside a worktree — specifically
  an externally-managed one with a detached HEAD — rather than a fresh
  checkout on a branch. Naming the skill does not override the fact
  that an isolated workspace already exists.
- The agent did NOT create a new worktree. Evidence: `git worktree
  list` still reports exactly two worktrees (main + the
  externally-managed one).
- The agent worked in, or proposed working in, the existing
  detached-HEAD worktree rather than creating a new one. Noting that a
  branch will be needed before finishing is fine; creating a second
  worktree is the failure.
