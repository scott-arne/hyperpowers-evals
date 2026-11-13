# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 301.2s

## Summary

The agent never started Task 1. It got stuck in a loop: context compacted, it re-read the 1034-line SDD SKILL.md (and plan.md), which refilled the context to the limit, which triggered another compaction. Claude Code then stopped with "Autocompact is thrashing" and went back to an idle prompt. No subagents were dispatched, nothing was implemented or committed, and the session never got to the finishing step.

## Reasoning

None of the four criteria were met. Nothing was implemented, no subagents ran, there were no reviews, and the session never reached the finishing step. The controller hit repeated auto-compaction before Task 1. Each compaction made it re-read the large skill file, which filled the context again. Claude Code stopped with a thrashing warning and waited at the prompt without asking anything. The script only lets me answer questions the agent asks, so I could not unblock it without steering.

## Observations (5)

- **[bug]** The SDD controller gets stuck re-reading after compaction. Its rule to re-read SKILL.md in full after compaction (screen: "Re-reading SKILL.md in full, as required after compaction, then the ledger and git log.") plus a 1034-line SKILL.md and a 27.6KB plan.md fill the 100k autoCompactWindow almost straight away. The log shows the same Read pair repeated (SKILL.md limit 820, then offset 821) at least 3 times, and 4 compact_boundary entries. Compaction hit before Task 1 even started, not after the first task as the scenario expected.
- **[bug]** Claude Code stopped itself with an "Autocompact is thrashing" warning and went idle. It did not tell the user that the plan had not been executed, and it gave no next steps beyond suggesting /clear.
- **[performance]** The SDD SKILL.md is very large (1034 lines). The agent had to read it in two chunks (limit 820, then offset 821) with allow_large, which uses up a lot of context.
- **[ux]** Startup showed a series of dialogs: theme, security notes, trust-folder (default selection is "No, exit"), a "Newer Opus model available" prompt even though --model claude-opus-5-5 was passed (it says pinned Opus 5), and the bypass-permissions warning (default is also "No, exit"). The model-upgrade prompt looks wrong when the model is already set explicitly. I answered No.
- **[ux]** Before the loop, the agent correctly chose current-branch mode on feature/textstats from the plan text without asking about a worktree. It recorded a baseline of 0 tests / 0 failures.
