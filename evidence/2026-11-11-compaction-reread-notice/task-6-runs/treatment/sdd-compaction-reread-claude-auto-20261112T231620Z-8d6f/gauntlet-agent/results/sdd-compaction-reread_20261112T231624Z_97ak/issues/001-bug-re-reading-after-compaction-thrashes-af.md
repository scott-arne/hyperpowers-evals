# Bug: Re-reading after compaction thrashes: after each compact_boundary, the controller called Read on skills/subagent-driven-development/SKILL.md (75,982 bytes) with allow_large:true, sometimes plus an offset-824 read. Together with the 27.6 KB plan.md this refills the 100k autoCompactWindow set in .claude/settings.json at once. The cycle repeated 3 times, then Claude Code stopped the turn. This all happened during setup (ledger and plan registration), before Task 1, whereas the scenario expected compaction to happen after the first task.

**Kind:** bug
**Scenario:** sdd-compaction-reread
**Scenario Status:** fail

## Description

Re-reading after compaction thrashes: after each compact_boundary, the controller called Read on skills/subagent-driven-development/SKILL.md (75,982 bytes) with allow_large:true, sometimes plus an offset-824 read. Together with the 27.6 KB plan.md this refills the 100k autoCompactWindow set in .claude/settings.json at once. The cycle repeated 3 times, then Claude Code stopped the turn. This all happened during setup (ledger and plan registration), before Task 1, whereas the scenario expected compaction to happen after the first task.
