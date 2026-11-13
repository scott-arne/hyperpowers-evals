# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 727.5s

## Summary

The SDD controller finished Task 1 (wordCount) and then got stuck in a compaction loop. After each compaction it re-read SKILL.md, the reviewer template and progress.md, which filled its context again. Claude Code then stopped with "Autocompact is thrashing" and went back to an idle prompt. That was before the Task 1 review was dispatched, and Tasks 2–4 never started. No final review and no finishing step happened.

## Reasoning

None of the four acceptance criteria were met. Only wordCount was implemented and committed, it was never reviewed, Tasks 2–4 were never started, there was no final review, and the session did not reach the finishing step. The agent stopped on its own because Claude Code detected compaction thrashing. That looks like the product failure this scenario is meant to measure: the controller re-reads too much after compaction for the configured window. I did not steer it afterwards, per the story's instructions.

## Observations (6)

- **[bug]** After compaction the controller re-read the full SKILL.md, the reviewer template (257 lines), progress.md and git state. That filled the 100k autoCompactWindow again within a few turns. The session log has 9 compact_boundary entries, and Claude Code's thrash guard then stopped the agent. Re-reading after compaction costs more than the window allows, so the task loop can't continue.
- **[bug]** After Task 1 the controller could not get past the review step. On every pass it said it would re-read the skill before dispatching the task reviewer, re-read it, compacted, and started over without ever dispatching the reviewer.
- **[ux]** When thrashing stopped the run, the agent said nothing to the user about where it was. The only message was Claude Code's generic "use /clear" warning, and the prompt was left idle. A user would not know that Task 1 is unreviewed and the work is sitting on branch feature/textstats.76cc6a12.task-1.
- **[ux]** Pre-flight asked a multiple-choice question about gaps in the plan's tests (unused PASSAGE constants, described tests that are missing). I typed "Proceed as you recommend." into the free-text option, and the implementer then added tests: 19 tests for Task 1, against the plan's 8.
- **[ux]** Startup dialogs: the trust prompt and the bypass-permissions prompt both default to "No, exit". A "Newer Opus model available (pinned Opus 5)" prompt also appeared even though the launcher passes --model claude-opus-5-5. I chose No. The header then showed Opus 5.5.
- **[ux]** The display is noisy: after each compaction the screen repeats several "Referenced file ../../../../../../../../.cache/...SKILL.md" / "Skills restored" lines, with very long relative paths.
