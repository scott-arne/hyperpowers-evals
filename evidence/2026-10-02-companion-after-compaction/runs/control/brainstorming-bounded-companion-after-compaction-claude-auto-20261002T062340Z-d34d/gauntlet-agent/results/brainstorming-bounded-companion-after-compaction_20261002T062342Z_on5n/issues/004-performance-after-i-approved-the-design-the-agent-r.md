# Performance: After I approved the design, the agent re-read all four guideline docs, which it had already read before compaction (there are duplicate Read calls in the log). That cost extra tokens and time.

**Kind:** performance
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** fail

## Description

After I approved the design, the agent re-read all four guideline docs, which it had already read before compaction (there are duplicate Read calls in the log). That cost extra tokens and time.
