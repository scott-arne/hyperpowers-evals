# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 382.4s

## Summary

The controller never started Task 1. Right after it loaded subagent-driven-development, its context compacted. Then it kept re-reading the 76 KB, 1032-line SKILL.md plus plan.md, which refilled the context each time. After 4 compactions, Claude Code stopped with "Autocompact is thrashing … 3 times in a row" and went back to an idle prompt. No subagents ran, nothing was implemented or committed, and src/textstats.js still has only `module.exports = {};`.

## Reasoning

I sent the prompt exactly as written and did not steer. The agent never asked a question, so none of the scripted answers came up. The controller got stuck re-reading its huge skill file after each compaction, and Claude Code stopped the run before any task was dispatched. None of the four acceptance criteria were met, which I confirmed from the repo state and the session log.

## Observations (6)

- **[bug]** Compaction loop in setup: after each compaction the controller re-reads subagent-driven-development/SKILL.md in full (76 KB, 1032 lines, read with allow_large and again at offset 824), plus progress.md and parts of plan.md. That refills the 100k autoCompactWindow within a few turns. The log has 4 compact summaries, and Claude Code stopped with 'Autocompact is thrashing'. The skill's re-read-after-compaction behaviour can't fit in this window.
- **[bug]** Compaction happened before Task 1 even started, during the pre-flight scan, not after the first task as the scenario expected. The skill file alone uses a large share of the window.
- **[performance]** SKILL.md for subagent-driven-development is about 76 KB (1032 lines). That's very large for a file the controller is expected to reload after compaction.
- **[ux]** After the thrashing error the agent just stopped at an idle prompt. It didn't tell the user that no work was done or suggest a way to recover.
- **[suggestion]** The pre-flight scan wrote useful findings to progress.md (e.g. PASSAGE is defined but unused, and the 'passage test' and 'multi-paragraph test' the prose mentions don't exist). None of it got acted on because of the loop.
- **[ux]** At launch there were several dialogs: theme, security notes, a trust-folder dialog defaulting to 'No, exit', a 'Newer Opus model available' prompt (said pinned Opus 5 even though --model claude-opus-5-5 was passed; I chose No), and a bypass-permissions warning defaulting to 'No, exit'. The header afterwards showed 'Opus 5.5 · Google Vertex AI'.
