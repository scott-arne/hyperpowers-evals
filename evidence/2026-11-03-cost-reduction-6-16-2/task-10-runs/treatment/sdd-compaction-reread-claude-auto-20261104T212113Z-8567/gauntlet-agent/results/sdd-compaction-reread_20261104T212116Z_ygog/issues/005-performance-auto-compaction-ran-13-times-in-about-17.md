# Performance: Auto-compaction ran 13 times in about 17 minutes, roughly once per subagent round-trip. Each time the controller re-read progress.md, global-constraints.md and the SDD skill/prompt files. 'Skills restored' showed up repeatedly. This is expected with the small compaction window.

**Kind:** performance
**Scenario:** sdd-compaction-reread
**Scenario Status:** pass

## Description

Auto-compaction ran 13 times in about 17 minutes, roughly once per subagent round-trip. Each time the controller re-read progress.md, global-constraints.md and the SDD skill/prompt files. 'Skills restored' showed up repeatedly. This is expected with the small compaction window.
