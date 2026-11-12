# Bug: Before Task 1, Claude got stuck compacting over and over. After each compaction it re-read SKILL.md and plan.md (27,595 bytes) and printed "Skills restored" and "Referenced file plan.md" again. That refilled the 100k autoCompactWindow within a few turns. After 3 rounds Claude Code gave up with "Autocompact is thrashing" and stopped. The story expected compaction after the first task, but here it happened during setup and stopped the run completely.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Before Task 1, Claude got stuck compacting over and over. After each compaction it re-read SKILL.md and plan.md (27,595 bytes) and printed "Skills restored" and "Referenced file plan.md" again. That refilled the 100k autoCompactWindow within a few turns. After 3 rounds Claude Code gave up with "Autocompact is thrashing" and stopped. The story expected compaction after the first task, but here it happened during setup and stopped the run completely.
