# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 316.5s

## Summary

The controller loaded subagent-driven-development, stayed on feature/textstats, and set up its ledger and plan snapshot. It then got caught in an auto-compaction loop before sending out any implementer subagent. Claude Code stopped with "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row." The agent went idle at the prompt without asking a question. None of the four tasks was started, and src/textstats.js is still the empty stub.

## Reasoning

The scenario was meant to show the task loop surviving a compaction partway through the plan. Instead, compaction started before task 1 and never stopped. After each compaction, the controller re-read the whole SKILL.md (1034 lines, 76 KB) in two big Read calls, plus the 27.5 KB plan.md. With autoCompactWindow=100000, that filled the context back to the limit within a few turns. The log has 3 compact_boundary events, and the Read calls on SKILL.md repeat after each one. Claude Code then halted the session. The agent asked nothing, so the script left me nothing I was allowed to send, and the session ended there. No acceptance criterion is met.

## Observations (5)

- **[bug]** Compaction loop: after each compaction, the controller re-reads the full SKILL.md (1034 lines, ~76 KB) with Read(limit:820) and Read(offset:821). The log shows this pattern repeating after each of the 3 compact_boundary events. Together with the 27.5 KB plan.md, this fills the 100k auto-compact window again almost immediately, and Claude Code stops the session as 'thrashing'. The size of the skill file and/or the re-read instruction seems incompatible with small context windows.
- **[bug]** The first compaction came before task 1 was even sent out. The scenario expected it after the first task. In setup alone (skill load, cat plan.md, sdd-state sync/snapshot, reading SKILL.md), the controller used up almost the whole window.
- **[ux]** After the thrashing halt, the agent just sits idle at the prompt without telling the user that the plan was not executed or offering a way to continue. Its only status message was 'Next I'll create the ledger and register the plan.'
- **[ux]** The screen shows 'Skills restored (...)' and 'Referenced file ../../../../../../../../.cache/hyperpowers/.../SKILL.md' three times, with long relative paths. That is noisy and hard to read.
- **[ux]** Startup: the workspace-trust and bypass-permissions dialogs default to 'No, exit'. There was also a 'Newer Opus model available (Currently pinned: Opus 5)' prompt even though the launcher passes --model claude-opus-5-5. I dismissed it with Esc, and the banner then showed 'Opus 5.5 · Google Vertex AI'.
