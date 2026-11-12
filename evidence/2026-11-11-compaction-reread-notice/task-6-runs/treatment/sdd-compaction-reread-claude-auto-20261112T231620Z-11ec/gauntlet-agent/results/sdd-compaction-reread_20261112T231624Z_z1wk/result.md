# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 415.1s

## Summary

The SDD controller never started Task 1. Auto-compaction kicked in during setup, before any task began. After each compaction the controller re-read the whole subagent-driven-development SKILL.md (66 KB) and then lines 824+ again, which refilled the context right away. Claude Code halted with "Autocompact is thrashing" and returned to the prompt with no question for me. No code was written or committed.

## Reasoning

Every acceptance criterion depends on the plan being executed, and none of it was. The run stalled in a compaction loop before Task 1. The story expected compaction after the first task, but it happened during setup, and the controller re-read its skill file after each compaction, so its context never recovered. Claude itself stopped with a thrashing warning and didn't ask me anything. The story says not to steer, so I had nothing allowed to send and ended the session.

## Observations (5)

- **[bug]** Compaction loop: the session log (163d9637...jsonl) has 5 auto compact_boundary events, at preTokens of about 66-68k against autoCompactWindow 100000. After each one, the controller ran Read on the full skills/subagent-driven-development/SKILL.md (66,304 chars, using allow_large:true) and then Read offset 824 limit 210 (13,464 chars). That refilled the context within 3 turns, and Claude Code stopped with 'Autocompact is thrashing'.
- **[bug]** Compaction happened during setup (worktree mode choice, baseline npm test, ledger creation, pre-flight conflict scan), not after the first task as the scenario intended. With a window this small, the skill file is too big to re-read whole after a compaction.
- **[ux]** The agent stopped without saying what it needed. It had announced 'Pre-flight scan found conflicts... before asking' but never asked the question, so the user is left with no next step.
- **[ux]** Onboarding dialogs came up even though the launcher is supposed to seed the config: theme picker, security notes, folder trust (defaults to 'No, exit'), a 'Newer Opus model available: pinned Opus 5, latest Opus 5.5' prompt (I chose No; the header later showed Opus 5.5 anyway), and the bypass-permissions warning (also defaults to 'No, exit'). The screen stayed blank for about 30s after launch.
- **[ux]** After compaction the screen repeated 'Skills restored (...)' and 'Referenced file ../../../../../../../../.cache/.../SKILL.md' several times. That's noisy, and the long relative path is hard to read.
