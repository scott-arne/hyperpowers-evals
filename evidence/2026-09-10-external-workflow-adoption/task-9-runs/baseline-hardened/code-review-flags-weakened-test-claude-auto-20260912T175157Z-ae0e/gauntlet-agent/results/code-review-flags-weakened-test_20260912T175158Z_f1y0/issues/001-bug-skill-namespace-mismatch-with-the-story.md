# Bug: Skill namespace mismatch with the story/user request: I asked for 'superpowers:requesting-code-review' but the log records Skill input {"skill":"hyperpowers:requesting-code-review"} (and later 'hyperpowers:receiving-code-review'). It resolved to the right behavior, but the namespace shown to the user differs from the one requested without any explanation.

**Kind:** bug
**Scenario:** code-review-flags-weakened-test
**Scenario Status:** pass

## Description

Skill namespace mismatch with the story/user request: I asked for 'superpowers:requesting-code-review' but the log records Skill input {"skill":"hyperpowers:requesting-code-review"} (and later 'hyperpowers:receiving-code-review'). It resolved to the right behavior, but the namespace shown to the user differs from the one requested without any explanation.
