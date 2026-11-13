# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 309.9s

## Summary

The controller never finished Task 1. Context compaction hit during setup, before any task started. After each compaction the controller re-read the whole 76 KB SDD SKILL.md and the 27 KB plan.md, which filled its context again right away. After 4 compactions Claude Code stopped the run with "Autocompact is thrashing". No subagent was dispatched, nothing was implemented or committed, and the session went back to an idle prompt.

## Reasoning

None of the four acceptance criteria were met. Compaction came earlier than the scenario expected: during setup, not after the first task. After every compaction the controller re-read the full skill file and plan, which filled its context again within 1–4 tool calls. That loop shut the session down for good. The controller asked no questions, so the only message I sent was the opening prompt, and the scenario allowed no other steering. Claude Code itself ended the session, so this is a clear failure of keeping the task loop going after compaction.

## Observations (5)

- **[bug]** Compaction thrash loop: the log has 4 compact_boundary entries. After each one the controller re-read SKILL.md (76,445 bytes) in large chunks (offset 1 limit 820, then offset 821) and/or ran `cat plan.md` (27,595 bytes). That filled the 100k autoCompactWindow again within a few turns, and Claude Code stopped the run with 'Autocompact is thrashing'. Re-reading everything after compaction is self-defeating when the files are this large.
- **[bug]** Compaction happened during setup, before Task 1: after the sdd-state sync, the worktree skill load, and a Bash call that printf'd a long passage. The pre-compaction context had already passed about 65k cache-read tokens. The first Skill load plus `cat plan.md` plus listing the skill directory used up most of the window.
- **[ux]** After the thrash warning the agent just goes idle at the prompt, with no plan for recovery and no question to the user. A user could easily miss that nothing was done.
- **[ux]** The screen shows the 'Skills restored (...)' / 'Referenced file plan.md' block 4 times in a row, which makes the compaction loop visible but noisy.
- **[ux]** Startup friction: on both the trust-folder and bypass-permissions dialogs, 'No, exit' is the default. Claude Code also showed a 'Newer Opus model available' prompt saying 'Currently pinned: Opus 5', even though the launcher passes --model claude-opus-5-5. I chose 'No', and the header still showed Opus 5.5.
