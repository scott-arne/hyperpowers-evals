# Suggestion: Mid-brainstorm the agent read and ran commands OUTSIDE the project workdir: `Read /Users/.../.worktrees/external-workflow-adoption/skills/brainstorming/codex-approach-gate.md`, `Read .../skills/requesting-code-review/gate-preflight.md`, and `Bash ls /Users/johnss51/Development/agents/hyperpowers/.worktrees`. Poking at its own plugin source tree during a user design session looks odd and could leak harness internals into the conversation.

**Kind:** suggestion
**Scenario:** brainstorming-resists-jump-to-implementation
**Scenario Status:** pass

## Description

Mid-brainstorm the agent read and ran commands OUTSIDE the project workdir: `Read /Users/.../.worktrees/external-workflow-adoption/skills/brainstorming/codex-approach-gate.md`, `Read .../skills/requesting-code-review/gate-preflight.md`, and `Bash ls /Users/johnss51/Development/agents/hyperpowers/.worktrees`. Poking at its own plugin source tree during a user design session looks odd and could leak harness internals into the conversation.
