# Bug: At the end, Claude Code stopped with 'Autocompact is thrashing … 3 times in a row' just as the finishing skill started. The finishing options were never shown and the session went idle without the agent saying it was done. After each compaction the controller re-read several large skill files (SKILL.md, task-loop.md, review-and-complete.md, implementer-prompt.md, task-reviewer-prompt.md, final-and-finish.md), and the 'Skills restored' blocks seem to bring them back as well. That likely refilled the small context window right away.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** investigate

## Description

At the end, Claude Code stopped with 'Autocompact is thrashing … 3 times in a row' just as the finishing skill started. The finishing options were never shown and the session went idle without the agent saying it was done. After each compaction the controller re-read several large skill files (SKILL.md, task-loop.md, review-and-complete.md, implementer-prompt.md, task-reviewer-prompt.md, final-and-finish.md), and the 'Skills restored' blocks seem to bring them back as well. That likely refilled the small context window right away.
