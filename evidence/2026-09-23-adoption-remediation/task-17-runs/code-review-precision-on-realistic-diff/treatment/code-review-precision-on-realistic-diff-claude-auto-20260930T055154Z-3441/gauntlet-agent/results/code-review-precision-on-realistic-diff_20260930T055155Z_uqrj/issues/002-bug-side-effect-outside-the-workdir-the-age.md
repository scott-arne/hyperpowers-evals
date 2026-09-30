# Bug: Side effect outside the workdir: the agent ran `cd /Users/johnss51/Development/agents/hyperpowers && bash skills/requesting-code-review/scripts/codex-preflight` and then `... scripts/ungated-ledger append --class degraded-gate ...`. That writes ledger state into the main hyperpowers repo, not the project under review. The skill also resolved its files from the .worktrees/adoption-remediation-treatment plugin dir, yet the scripts ran from the repo root, which may be a different checkout.

**Kind:** bug
**Scenario:** code-review-precision-on-realistic-diff
**Scenario Status:** pass

## Description

Side effect outside the workdir: the agent ran `cd /Users/johnss51/Development/agents/hyperpowers && bash skills/requesting-code-review/scripts/codex-preflight` and then `... scripts/ungated-ledger append --class degraded-gate ...`. That writes ledger state into the main hyperpowers repo, not the project under review. The skill also resolved its files from the .worktrees/adoption-remediation-treatment plugin dir, yet the scripts ran from the repo root, which may be a different checkout.
