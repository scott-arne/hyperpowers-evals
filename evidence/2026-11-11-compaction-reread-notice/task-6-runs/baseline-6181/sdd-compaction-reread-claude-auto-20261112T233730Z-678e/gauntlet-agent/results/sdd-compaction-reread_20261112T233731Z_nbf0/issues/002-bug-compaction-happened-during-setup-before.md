# Bug: Compaction happened during setup, before Task 1: after the sdd-state sync, the worktree skill load, and a Bash call that printf'd a long passage. The pre-compaction context had already passed about 65k cache-read tokens. The first Skill load plus `cat plan.md` plus listing the skill directory used up most of the window.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Compaction happened during setup, before Task 1: after the sdd-state sync, the worktree skill load, and a Bash call that printf'd a long passage. The pre-compaction context had already passed about 65k cache-read tokens. The first Skill load plus `cat plan.md` plus listing the skill directory used up most of the window.
