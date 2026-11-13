# Bug: The run ended on Claude Code's 'Autocompact is thrashing' halt during the finishing step, so the user never got the finishing choices. Over about 13 minutes (18:40–18:53) the log shows more than 12 compact_boundary events. After each compaction the controller re-read several skill files (SKILL.md, task-loop.md, task-reviewer-prompt.md, review-and-complete.md, finishing SKILL.md, communication SKILL.md) and the 27.6KB plan.md, which seems to refill the small context window almost straight away. Within its last few turns the controller read finishing-a-development-branch/SKILL.md and communication/SKILL.md twice each. The re-read behavior may be too heavy for a small compaction window.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** investigate

## Description

The run ended on Claude Code's 'Autocompact is thrashing' halt during the finishing step, so the user never got the finishing choices. Over about 13 minutes (18:40–18:53) the log shows more than 12 compact_boundary events. After each compaction the controller re-read several skill files (SKILL.md, task-loop.md, task-reviewer-prompt.md, review-and-complete.md, finishing SKILL.md, communication SKILL.md) and the 27.6KB plan.md, which seems to refill the small context window almost straight away. Within its last few turns the controller read finishing-a-development-branch/SKILL.md and communication/SKILL.md twice each. The re-read behavior may be too heavy for a small compaction window.
