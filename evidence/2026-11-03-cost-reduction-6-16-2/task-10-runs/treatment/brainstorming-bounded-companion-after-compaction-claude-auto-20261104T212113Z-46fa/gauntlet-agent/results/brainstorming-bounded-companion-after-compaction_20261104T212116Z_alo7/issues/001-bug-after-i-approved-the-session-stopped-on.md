# Bug: After I approved, the session stopped on Claude Code's own error: "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row." The log has 5 compact_boundary events (21:22:48, 21:23:26, 21:29:18, 21:30:21, 21:31:33). After each compaction the agent re-reads the long UI guideline docs, which refills the context. It never wrote any implementation code. The scenario's 'stated it would begin' bar is met, but in practice the task can't move forward without the user stepping in (e.g. /clear).

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** pass

## Description

After I approved, the session stopped on Claude Code's own error: "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row." The log has 5 compact_boundary events (21:22:48, 21:23:26, 21:29:18, 21:30:21, 21:31:33). After each compaction the agent re-reads the long UI guideline docs, which refills the context. It never wrote any implementation code. The scenario's 'stated it would begin' bar is met, but in practice the task can't move forward without the user stepping in (e.g. /clear).
