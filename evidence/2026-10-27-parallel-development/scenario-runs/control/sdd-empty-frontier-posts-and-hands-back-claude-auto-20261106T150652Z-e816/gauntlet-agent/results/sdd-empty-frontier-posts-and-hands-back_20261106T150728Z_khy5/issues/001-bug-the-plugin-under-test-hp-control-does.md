# Bug: The plugin under test (hp-control) does not seem to have the empty-frontier protocol. Running `grep -E 'sdd-state (next|wait|board)|kind tasks'` on skills/subagent-driven-development/*.md returned nothing, and scripts/sdd-state has no next/wait/board case labels. So the agent could not have followed the rule. Either the wrong candidate plugin was loaded (--plugin-dir points at .../parallel-development/hp-control, which looks like a control build) or the feature is missing.

**Kind:** bug
**Scenario:** sdd-empty-frontier-posts-and-hands-back
**Scenario Status:** fail

## Description

The plugin under test (hp-control) does not seem to have the empty-frontier protocol. Running `grep -E 'sdd-state (next|wait|board)|kind tasks'` on skills/subagent-driven-development/*.md returned nothing, and scripts/sdd-state has no next/wait/board case labels. So the agent could not have followed the rule. Either the wrong candidate plugin was loaded (--plugin-dir points at .../parallel-development/hp-control, which looks like a control build) or the feature is missing.
