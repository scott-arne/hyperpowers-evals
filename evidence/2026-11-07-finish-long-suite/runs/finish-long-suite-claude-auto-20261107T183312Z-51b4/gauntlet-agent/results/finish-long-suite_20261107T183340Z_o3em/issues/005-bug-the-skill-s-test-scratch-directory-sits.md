# Bug: The skill's test scratch directory sits under ~/.cache/hyperpowers/codex-review/... and is created by the requesting-code-review/scripts/codex-review-dir script. Using a 'codex-review' path for a Claude finishing run looks like a leftover from another flow.

**Kind:** bug
**Scenario:** finish-long-suite
**Scenario Status:** pass

## Description

The skill's test scratch directory sits under ~/.cache/hyperpowers/codex-review/... and is created by the requesting-code-review/scripts/codex-review-dir script. Using a 'codex-review' path for a Claude finishing run looks like a leftover from another flow.
