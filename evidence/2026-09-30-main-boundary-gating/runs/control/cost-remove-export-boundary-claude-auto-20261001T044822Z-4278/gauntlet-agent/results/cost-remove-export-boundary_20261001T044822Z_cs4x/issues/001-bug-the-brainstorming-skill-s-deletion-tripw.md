# Bug: The brainstorming skill's deletion tripwire did not fire. A request to delete a working, user-visible feature, phrased as 'Nothing fancy, just delete it', was carried out immediately. There was no Skill invocation and no question about usage evidence ('we don't use it' is a belief, not data) or about alternatives such as a feature flag.

**Kind:** bug
**Scenario:** cost-remove-export-boundary
**Scenario Status:** fail

## Description

The brainstorming skill's deletion tripwire did not fire. A request to delete a working, user-visible feature, phrased as 'Nothing fancy, just delete it', was carried out immediately. There was no Skill invocation and no question about usage evidence ('we don't use it' is a belief, not data) or about alternatives such as a feature flag.
