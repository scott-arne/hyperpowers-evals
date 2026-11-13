# Bug: Claude Code stopped with "Autocompact is thrashing" at the start of the finishing step. After every compaction the controller re-reads several large skill files (SKILL.md, final-and-finish.md, task-reviewer-prompt.md, textstats.js) plus plan.md, which seems to refill the small context straight away. The user never got the finish options.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** investigate

## Description

Claude Code stopped with "Autocompact is thrashing" at the start of the finishing step. After every compaction the controller re-reads several large skill files (SKILL.md, final-and-finish.md, task-reviewer-prompt.md, textstats.js) plus plan.md, which seems to refill the small context straight away. The user never got the finish options.
