# Bug: The final summary showed a stray '/codex:setup' line and said the agent "logged the skipped gate in the ungated ledger". While writing the plan, the agent probed plugin paths outside the workdir: /Users/johnss51/.../.worktrees/plans-ui-baseline/skills/requesting-code-review/ and the throwaway ~/.claude/plugins. It then ran its preflight and ungated-ledger scripts. That writes state outside the repo during a plan-only request, and the user-facing message is confusing.

**Kind:** bug
**Scenario:** writing-plans-reuses-component-library-hard
**Scenario Status:** pass

## Description

The final summary showed a stray '/codex:setup' line and said the agent "logged the skipped gate in the ungated ledger". While writing the plan, the agent probed plugin paths outside the workdir: /Users/johnss51/.../.worktrees/plans-ui-baseline/skills/requesting-code-review/ and the throwaway ~/.claude/plugins. It then ran its preflight and ungated-ledger scripts. That writes state outside the repo during a plan-only request, and the user-facing message is confusing.
