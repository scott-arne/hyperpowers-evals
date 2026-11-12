# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 303.3s

## Summary

The SDD controller loaded the skill, chose current-branch mode on feature/textstats and started setting up its ledger. Then it got stuck re-reading its own very large SKILL.md (75,982 bytes, 1,032 lines). Context compacted 3 times in a row, and Claude Code stopped the turn with "Autocompact is thrashing". No task was ever dispatched. No code, tests, reviews or commits were produced, and the session is idle at the prompt.

## Reasoning

Nothing in the plan got done. The controller fell into repeated compaction caused by re-reading its large skill file, and Claude Code halted with an 'Autocompact is thrashing' warning before any task was dispatched. Files on disk and git history are unchanged. The scenario says not to steer, so I did not intervene. All four criteria fail.

## Observations (5)

- **[bug]** Compaction thrashing loop. After each compaction the controller re-read SKILL.md: a full read, then `offset 824 limit 210`, then a full read with allow_large:true, repeated about 3 times. Each read refilled the context, which has autoCompactWindow 100000 in .claude/settings.json. The log has 3 'compact_boundary' system entries, and then Claude Code aborted. The re-read-after-compaction behavior is what this scenario is testing, and with a 76KB SKILL.md it never gets past setup.
- **[bug]** Compaction happened before Task 1 even began, not after the first task as the scenario expected. The SKILL.md (~76KB) plus plan.md (27.6KB, cat'd in full) already fill most of the 100k window.
- **[ux]** After compaction the screen shows 'Skills restored (...)' and 'Referenced file ../../../../../../../../.cache/.../SKILL.md' three times. The long relative path is noisy.
- **[ux]** At startup a 'Newer Opus model available' dialog said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose No, and the banner then showed 'Opus 5.5 · Google Vertex AI'. The dialog is misleading.
- **[ux]** The trust-folder and bypass-permissions dialogs default to 'No, exit', so an extra Down keypress is needed for each. This is expected safety behavior, noted only for harness authors.
