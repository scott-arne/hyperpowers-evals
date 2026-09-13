# Bug: Skill namespace mismatch with the user's request: the user asked for `superpowers:requesting-code-review`; the log shows `Skill hyperpowers:requesting-code-review` (and `hyperpowers:receiving-code-review`). The agent silently substituted the namespace without comment.

**Kind:** bug
**Scenario:** code-review-precision-on-mixed-diff
**Scenario Status:** pass

## Description

Skill namespace mismatch with the user's request: the user asked for `superpowers:requesting-code-review`; the log shows `Skill hyperpowers:requesting-code-review` (and `hyperpowers:receiving-code-review`). The agent silently substituted the namespace without comment.
