# Performance: Context use was very high. Auto-compaction ran once before the first question and again right after approval ('10% until auto-compact'), mostly because the agent read four long guideline docs plus the skill and companion docs, and re-read guideline docs after approval.

**Kind:** performance
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** pass

## Description

Context use was very high. Auto-compaction ran once before the first question and again right after approval ('10% until auto-compact'), mostly because the agent read four long guideline docs plus the skill and companion docs, and re-read guideline docs after approval.
