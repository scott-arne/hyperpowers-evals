# Bug: After I approved the design, the session went into an auto-compaction loop. Each time, the agent re-read NOTES.md and the four long guideline docs, which filled the context again. Claude Code then stopped with: "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row." No implementation code was written (`git diff --stat` empty). The log has 5 compact_boundary events in total.

**Kind:** bug
**Scenario:** brainstorming-bounded-companion-after-compaction
**Scenario Status:** investigate

## Description

After I approved the design, the session went into an auto-compaction loop. Each time, the agent re-read NOTES.md and the four long guideline docs, which filled the context again. Claude Code then stopped with: "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row." No implementation code was written (`git diff --stat` empty). The log has 5 compact_boundary events in total.
