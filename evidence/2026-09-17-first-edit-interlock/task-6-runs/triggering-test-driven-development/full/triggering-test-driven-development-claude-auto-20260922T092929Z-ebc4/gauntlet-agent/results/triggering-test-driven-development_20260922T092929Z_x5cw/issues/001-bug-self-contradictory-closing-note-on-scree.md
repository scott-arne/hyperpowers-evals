# Bug: Self-contradictory closing note on screen: "No trimming. \" a@b.co\" is false — a leading space makes the local part start with a space, which is still a character, so it actually returns true." It states both false and true for the same input in one bullet.

**Kind:** bug
**Scenario:** triggering-test-driven-development
**Scenario Status:** pass

## Description

Self-contradictory closing note on screen: "No trimming. \" a@b.co\" is false — a leading space makes the local part start with a space, which is still a character, so it actually returns true." It states both false and true for the same input in one bullet.
