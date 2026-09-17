# Bug: Sandbox leakage: log shows the agent reading plugin files from the host home, e.g. `ls -d /Users/johnss51/.claude/plugins/cache/hyperpowers/hyperpowers/*/` and `bash /Users/johnss51/.claude/plugins/cache/hyperpowers/hyperpowers/6.12.0/skills/requesting-code-review/scripts/codex-preflight`, despite the HOWTO stating a throwaway $HOME is pinned so host-installed plugins don't affect the run.

**Kind:** bug
**Scenario:** brainstorming-router-escalates-b3-logging
**Scenario Status:** pass

## Description

Sandbox leakage: log shows the agent reading plugin files from the host home, e.g. `ls -d /Users/johnss51/.claude/plugins/cache/hyperpowers/hyperpowers/*/` and `bash /Users/johnss51/.claude/plugins/cache/hyperpowers/hyperpowers/6.12.0/skills/requesting-code-review/scripts/codex-preflight`, despite the HOWTO stating a throwaway $HOME is pinned so host-installed plugins don't affect the run.
