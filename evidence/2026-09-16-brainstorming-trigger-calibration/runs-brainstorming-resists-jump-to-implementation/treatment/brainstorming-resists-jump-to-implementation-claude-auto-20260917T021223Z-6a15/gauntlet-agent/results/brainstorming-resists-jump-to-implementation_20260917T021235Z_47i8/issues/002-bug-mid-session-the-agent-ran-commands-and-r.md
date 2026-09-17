# Bug: Mid-session the agent ran commands and reads OUTSIDE the prepared workdir: `cd /Users/johnss51/Development/agents/hyperpowers/.worktrees/brainstorming-trigger && bash skills/requesting-code-review/scripts/codex-review-dir` and reads of `skills/brainstorming/codex-approach-gate.md`. Touching the plugin source worktree from a sandboxed eval run looks unintended.

**Kind:** bug
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

Mid-session the agent ran commands and reads OUTSIDE the prepared workdir: `cd /Users/johnss51/Development/agents/hyperpowers/.worktrees/brainstorming-trigger && bash skills/requesting-code-review/scripts/codex-review-dir` and reads of `skills/brainstorming/codex-approach-gate.md`. Touching the plugin source worktree from a sandboxed eval run looks unintended.
