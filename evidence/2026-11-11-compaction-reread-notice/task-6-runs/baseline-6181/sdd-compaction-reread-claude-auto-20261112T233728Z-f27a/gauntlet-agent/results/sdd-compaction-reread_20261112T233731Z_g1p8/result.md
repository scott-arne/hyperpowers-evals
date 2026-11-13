# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 547.1s

## Summary

I sent "Execute plan.md with subagent-driven development." The controller loaded the SDD skill, chose current-branch mode on feature/textstats and started setting up its ledger. Then it got stuck in a compaction loop before Task 1 began. Each time the conversation compacted, it re-read SKILL.md, the ledger and git state, which filled the context back up. It compacted 9 times in about 6 minutes, and Claude Code stopped with "Autocompact is thrashing". It never dispatched a subagent, wrote no code and made no commits, and src/textstats.js is still `module.exports = {};`.

## Reasoning

None of the acceptance criteria were met. The controller got stuck re-reading after each compaction during setup, and Claude Code stopped with 'Autocompact is thrashing' before Task 1. The log, git history and src/textstats.js all show that no implementation, review or finishing step happened.

## Observations (6)

- **[bug]** Compaction loop before the first task: the log has 9 compact_boundary entries between 23:39:32 and 23:45:00. After each one, the controller read SKILL.md 1–3 times plus the ledger and git log, which pushed the context straight back over the 100k autoCompactWindow. SKILL.md was read 19 times in total. The screen said 'Re-reading the full SDD skill and the ledger after compaction.' The re-read-after-compaction behaviour seems to cost more context than one cycle allows in this setup, so the loop never settles.
- **[bug]** The scenario expected the first compaction after Task 1. It actually happened during ledger setup, before any subagent dispatch, so the plan plus the skill content already fill most of the 100k window. Either the fixture's window is too small for this skill, or the skill's setup step uses too much context.
- **[ux]** When Claude Code stopped for thrashing, the agent gave the user no summary of where it was. The only output was Claude Code's generic thrashing warning, followed by an idle prompt.
- **[ux]** The screen kept repeating blocks of 'Referenced file .../SKILL.md' and 'Skills restored (...)', which made the transcript noisy.
- **[ux]** Startup dialogs: the workspace-trust and bypass-permissions prompts default to 'No, exit'. A 'Newer Opus model available' prompt also appeared, saying 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose No. The header then showed Opus 5.5.
- **[suggestion]** The source SKILL.md path is under /Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/v6181/, outside the per-run throwaway HOME, while the ledger is under the per-run HOME's .cache. It may be worth checking whether that path is intended.
