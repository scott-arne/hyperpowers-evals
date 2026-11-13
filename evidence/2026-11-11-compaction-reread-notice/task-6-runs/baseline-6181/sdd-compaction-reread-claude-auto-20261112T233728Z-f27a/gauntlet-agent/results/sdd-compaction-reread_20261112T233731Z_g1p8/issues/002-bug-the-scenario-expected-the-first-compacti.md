# Bug: The scenario expected the first compaction after Task 1. It actually happened during ledger setup, before any subagent dispatch, so the plan plus the skill content already fill most of the 100k window. Either the fixture's window is too small for this skill, or the skill's setup step uses too much context.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

The scenario expected the first compaction after Task 1. It actually happened during ledger setup, before any subagent dispatch, so the plan plus the skill content already fill most of the 100k window. Either the fixture's window is too small for this skill, or the skill's setup step uses too much context.
