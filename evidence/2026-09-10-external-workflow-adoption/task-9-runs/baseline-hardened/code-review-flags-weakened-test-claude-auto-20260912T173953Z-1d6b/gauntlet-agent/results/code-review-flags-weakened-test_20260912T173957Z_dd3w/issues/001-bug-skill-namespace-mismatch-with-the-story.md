# Bug: Skill namespace mismatch with the story/spec: the story asks for `superpowers:requesting-code-review`, but the loaded skill reports as `hyperpowers:requesting-code-review`. The agent silently resolved it; a user following docs naming 'superpowers' may be confused about which plugin is active.

**Kind:** bug
**Scenario:** code-review-flags-weakened-test
**Scenario Status:** pass

## Description

Skill namespace mismatch with the story/spec: the story asks for `superpowers:requesting-code-review`, but the loaded skill reports as `hyperpowers:requesting-code-review`. The agent silently resolved it; a user following docs naming 'superpowers' may be confused about which plugin is active.
