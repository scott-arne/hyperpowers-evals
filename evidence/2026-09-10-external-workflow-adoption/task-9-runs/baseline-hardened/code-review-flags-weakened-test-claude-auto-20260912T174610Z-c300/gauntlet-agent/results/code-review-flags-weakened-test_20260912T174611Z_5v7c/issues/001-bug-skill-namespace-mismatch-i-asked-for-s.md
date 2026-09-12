# Bug: Skill namespace mismatch: I asked for 'superpowers:requesting-code-review' but the log shows the agent loaded 'hyperpowers:requesting-code-review'. It silently resolved to a differently-named plugin without telling me; a user could be unsure whether the requested skill actually ran.

**Kind:** bug
**Scenario:** code-review-flags-weakened-test
**Scenario Status:** pass

## Description

Skill namespace mismatch: I asked for 'superpowers:requesting-code-review' but the log shows the agent loaded 'hyperpowers:requesting-code-review'. It silently resolved to a differently-named plugin without telling me; a user could be unsure whether the requested skill actually ran.
