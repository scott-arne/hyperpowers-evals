# Bug: Needs investigation: during the spec gate the agent ran scripts from outside the workdir, in /Users/johnss51/Development/agents/hyperpowers/.worktrees/ladder-b1-control (codex-preflight, codex-review-dir, ungated-ledger append). The stub Codex companion returned {}, and the agent logged a 'degraded-gate' ledger entry: 'spec proceeds to user review unreviewed by Codex'. It is a leak that the eval environment can reach a host worktree path.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b1-userid-param
**Scenario Status:** investigate

## Description

Needs investigation: during the spec gate the agent ran scripts from outside the workdir, in /Users/johnss51/Development/agents/hyperpowers/.worktrees/ladder-b1-control (codex-preflight, codex-review-dir, ungated-ledger append). The stub Codex companion returned {}, and the agent logged a 'degraded-gate' ledger entry: 'spec proceeds to user review unreviewed by Codex'. It is a leak that the eval environment can reach a host worktree path.
