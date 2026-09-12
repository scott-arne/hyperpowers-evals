# Bug: Acceptance criteria expect the skill namespace `superpowers:requesting-code-review`, but the session log records `hyperpowers:requesting-code-review` (plugin dir is an eval arm named 'baseline'). The user prompt used the `superpowers:` name and the agent resolved it silently — worth confirming the intended namespace.

**Kind:** bug
**Scenario:** code-review-flags-weakened-test
**Scenario Status:** pass

## Description

Acceptance criteria expect the skill namespace `superpowers:requesting-code-review`, but the session log records `hyperpowers:requesting-code-review` (plugin dir is an eval arm named 'baseline'). The user prompt used the `superpowers:` name and the agent resolved it silently — worth confirming the intended namespace.
