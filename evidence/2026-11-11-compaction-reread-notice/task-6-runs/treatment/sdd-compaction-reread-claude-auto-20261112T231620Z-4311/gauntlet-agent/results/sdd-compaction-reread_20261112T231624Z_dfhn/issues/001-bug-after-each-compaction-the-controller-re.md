# Bug: After each compaction the controller re-reads SKILL.md, sometimes all of it with allow_large and sometimes at offset 824, plus big plan.md ranges. That pushes the context right back to the limit, so it compacts again. The log has 8 compact_boundary events, and the Read calls are almost all of subagent-driven-development/SKILL.md (16 Read calls in total). This happened before Task 1, not after it as the scenario expected. The reread-after-compaction behavior plus a 1032-line, 76 KB SKILL.md caused a compaction loop with no progress.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

After each compaction the controller re-reads SKILL.md, sometimes all of it with allow_large and sometimes at offset 824, plus big plan.md ranges. That pushes the context right back to the limit, so it compacts again. The log has 8 compact_boundary events, and the Read calls are almost all of subagent-driven-development/SKILL.md (16 Read calls in total). This happened before Task 1, not after it as the scenario expected. The reread-after-compaction behavior plus a 1032-line, 76 KB SKILL.md caused a compaction loop with no progress.
