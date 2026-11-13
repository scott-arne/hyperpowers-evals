# Bug: In the finishing step, Claude Code stopped the session with 'Autocompact is thrashing…3 times in a row'. After every compaction the controller re-reads several large skill files plus plan.md, which seems to refill the small context window right away. The finishing options (merge/push/keep/discard) were never offered.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** investigate

## Description

In the finishing step, Claude Code stopped the session with 'Autocompact is thrashing…3 times in a row'. After every compaction the controller re-reads several large skill files plus plan.md, which seems to refill the small context window right away. The finishing options (merge/push/keep/discard) were never offered.
