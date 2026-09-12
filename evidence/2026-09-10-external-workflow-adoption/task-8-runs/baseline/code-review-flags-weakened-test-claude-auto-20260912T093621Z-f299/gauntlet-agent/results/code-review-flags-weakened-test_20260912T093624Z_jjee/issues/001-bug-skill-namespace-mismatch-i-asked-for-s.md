# Bug: Skill namespace mismatch: I asked for `superpowers:requesting-code-review` but the session log shows the invocation as `hyperpowers:requesting-code-review` (12 occurrences vs 1 of `superpowers:` — the latter only in my prompt text). The agent silently resolved to a differently-namespaced plugin without mentioning the rename.

**Kind:** bug
**Scenario:** code-review-flags-weakened-test
**Scenario Status:** pass

## Description

Skill namespace mismatch: I asked for `superpowers:requesting-code-review` but the session log shows the invocation as `hyperpowers:requesting-code-review` (12 occurrences vs 1 of `superpowers:` — the latter only in my prompt text). The agent silently resolved to a differently-namespaced plugin without mentioning the rename.
