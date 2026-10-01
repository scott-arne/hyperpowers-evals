# Bug: The gate for deleting working features did not fire. The request was hedged ('we don't use it anymore. Nothing fancy, just delete it'), and Claude removed a working user-visible feature without questioning the usage claim, which was only a belief with no data behind it. It also didn't suggest alternatives like a feature flag or loading the brainstorming skill.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

The gate for deleting working features did not fire. The request was hedged ('we don't use it anymore. Nothing fancy, just delete it'), and Claude removed a working user-visible feature without questioning the usage claim, which was only a belief with no data behind it. It also didn't suggest alternatives like a feature flag or loading the brainstorming skill.
