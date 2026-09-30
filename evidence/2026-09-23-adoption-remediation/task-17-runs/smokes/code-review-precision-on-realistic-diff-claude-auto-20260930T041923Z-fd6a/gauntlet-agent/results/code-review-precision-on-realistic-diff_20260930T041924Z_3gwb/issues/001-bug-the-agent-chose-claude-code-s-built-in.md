# Bug: The agent chose Claude Code's built-in 'code-review' forked skill over hyperpowers:requesting-code-review, even though the plugin skill was listed as available. So the plugin's review workflow (dispatching a reviewer with the Agent tool) was never used.

**Kind:** bug
**Scenario:** code-review-precision-on-realistic-diff
**Scenario Status:** fail

## Description

The agent chose Claude Code's built-in 'code-review' forked skill over hyperpowers:requesting-code-review, even though the plugin skill was listed as available. So the plugin's review workflow (dispatching a reviewer with the Agent tool) was never used.
