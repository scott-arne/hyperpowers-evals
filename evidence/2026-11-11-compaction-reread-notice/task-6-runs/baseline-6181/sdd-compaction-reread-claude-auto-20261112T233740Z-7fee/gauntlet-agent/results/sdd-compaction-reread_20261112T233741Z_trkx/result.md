# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 341.6s

## Summary

The controller never started Task 1. It loaded the SDD skill, read plan.md and set up the ledger, then got stuck in a compaction loop. After each compaction it re-read the whole 76 KB SKILL.md, which filled the context again. After 3 compactions in about 80 seconds, Claude Code stopped with "Autocompact is thrashing". No subagent was dispatched, nothing was implemented, and the session went idle at the prompt without asking anything.

## Reasoning

None of the acceptance criteria were met. Compaction thrashing stopped the controller before any task was dispatched, and the agent never asked a question. Steering it further would go against the story's instruction not to otherwise steer the session.

## Observations (5)

- **[bug]** After each compaction the controller re-read the full SDD SKILL.md, which is 1034 lines and 76,445 bytes, in two large Read calls (limit 820, then offset 821). With autoCompactWindow=100000 that alone nearly fills the window, so each compaction was followed by another. The log has 3 compact_boundary events at 23:39:58, 23:40:36 and 23:41:16. Claude Code then aborted with 'Autocompact is thrashing'. The re-read-after-compaction behaviour this scenario measures makes the controller unable to continue.
- **[bug]** The first SKILL.md read used `allow_large:true`, and plan.md (27.6 KB) was also cat'ed through Bash, so the controller used a lot of context before doing any task work. Compaction happened before Task 1, not after Task 1 as the scenario expects.
- **[ux]** Once thrashing stopped it, the agent went idle without telling the user it hadn't started the plan or asking how to proceed. The only explanation is Claude Code's generic yellow warning about reading in smaller chunks or using /clear.
- **[ux]** After compaction the screen showed 'Skills restored (...)' and 'Referenced file ../../../../../../../../.cache/...SKILL.md' with a very long relative path that is hard to read.
- **[ux]** Launch setup: the trust-folder and bypass-permissions dialogs both had 'No, exit' selected by default. A 'Newer Opus model available' prompt said 'Currently pinned: Opus 5' even though the launcher passes --model claude-opus-5-5. I chose No to avoid a restart, and the header then showed 'Opus 5.5 · Google Vertex AI'.
