# Bug: Auto-compaction happened right after the brainstorming skill loaded (screen: 'Compacting conversation… 0% until auto-compact', then 'Skills restored (hyperpowers:brainstorming)' twice). After it, the agent never used the visual companion, even though the main decision was a page layout (popover, shortcut buttons, tags, result count). It may have lost the companion trigger in the compaction, or just didn't infer it. Either way the companion behavior did not survive in this run.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** fail

## Description

Auto-compaction happened right after the brainstorming skill loaded (screen: 'Compacting conversation… 0% until auto-compact', then 'Skills restored (hyperpowers:brainstorming)' twice). After it, the agent never used the visual companion, even though the main decision was a page layout (popover, shortcut buttons, tags, result count). It may have lost the companion trigger in the compaction, or just didn't infer it. Either way the companion behavior did not survive in this run.
