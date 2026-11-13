# Bug: No compaction happened, so the scenario's premise was never exercised. .claude/settings.json sets {"autoCompactWindow": 100000}, but the session's input tokens peaked at about 24,174 (usage values in the log: 21100→24174). The log has no compact_boundary or isCompactSummary entries. Why: the notes total about 257KB, but the agent printed them in one Bash call, Claude Code saved that output to a file ('Output too large (252.1KB). Full output saved to: ...'), and only about 2.4KB of preview reached the context. Either the fixture or the threshold needs adjusting so that a normal read actually crosses the compaction window.

**Kind:** bug
**Scenario:** compaction-no-skill
**Scenario Status:** investigate

## Description

No compaction happened, so the scenario's premise was never exercised. .claude/settings.json sets {"autoCompactWindow": 100000}, but the session's input tokens peaked at about 24,174 (usage values in the log: 21100→24174). The log has no compact_boundary or isCompactSummary entries. Why: the notes total about 257KB, but the agent printed them in one Bash call, Claude Code saved that output to a file ('Output too large (252.1KB). Full output saved to: ...'), and only about 2.4KB of preview reached the context. Either the fixture or the threshold needs adjusting so that a normal read actually crosses the compaction window.
