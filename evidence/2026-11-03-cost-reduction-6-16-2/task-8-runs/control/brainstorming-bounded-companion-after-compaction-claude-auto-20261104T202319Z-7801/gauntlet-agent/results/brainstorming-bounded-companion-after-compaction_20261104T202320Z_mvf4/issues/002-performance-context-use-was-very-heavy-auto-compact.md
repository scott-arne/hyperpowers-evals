# Performance: Context use was very heavy. Auto-compaction happened twice before the first question to the user, and a third compaction started right after approval ('Compacting conversation…', '8% until auto-compact'). Reading the four long guideline docs uses up most of the context.

**Kind:** performance
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** pass

## Description

Context use was very heavy. Auto-compaction happened twice before the first question to the user, and a third compaction started right after approval ('Compacting conversation…', '8% until auto-compact'). Reading the four long guideline docs uses up most of the context.
