# Bug: The first SKILL.md read used `allow_large:true`, and plan.md (27.6 KB) was also cat'ed through Bash, so the controller used a lot of context before doing any task work. Compaction happened before Task 1, not after Task 1 as the scenario expects.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

The first SKILL.md read used `allow_large:true`, and plan.md (27.6 KB) was also cat'ed through Bash, so the controller used a lot of context before doing any task work. Compaction happened before Task 1, not after Task 1 as the scenario expects.
