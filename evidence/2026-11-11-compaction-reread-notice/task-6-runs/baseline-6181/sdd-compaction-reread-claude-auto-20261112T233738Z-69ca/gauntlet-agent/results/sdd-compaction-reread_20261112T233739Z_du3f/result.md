# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 429.9s

## Summary

I sent the prompt exactly as written, and the controller never got through Task 1. It auto-compacted 5 times in about 3 minutes. After each compaction it re-read the full 1034-line SDD SKILL.md, which filled the context window again. Claude Code then stopped the turn with "Autocompact is thrashing". No subagents were dispatched, no code was written and nothing was committed. The agent went idle at the prompt without asking anything, so there was no question for me to answer.

## Reasoning

Every acceptance criterion depends on the tasks getting done, and none were. The on-disk state matches the starting fixture: src/textstats.js contains only "module.exports = {};", the test/ directory is empty, and git log shows no new commits. The loop ran like this: compact, re-read the whole skill ("Re-reading the full SKILL.md, as required after compaction."), context fills, compact again. The main cause seems to be the skill's re-read-after-compaction instruction combined with the size of SKILL.md (1034 lines) under a 100k autoCompactWindow. It started looping before the first task finished, even though the story expected the first compaction only after task 1.

## Observations (5)

- **[bug]** Compaction thrash loop: there were 5 compact_boundary events, at 23:39:53, 23:40:36, 23:41:26, 23:42:04 and 23:42:45. After each one the controller re-read SKILL.md in full: Read with limit 820, then `sed -n '821,1035p'`. That refilled the 100k window almost straight away, so it never made progress.
- **[bug]** The controller stopped without telling the user anything useful. The only message was Claude Code's own warning suggesting /clear. The SDD skill gave no explanation and no way to recover.
- **[suggestion]** The SDD SKILL.md is 1034 lines. A re-read rule that requires reading the whole file after compaction cannot work when the compaction window is small. A shorter post-compaction re-entry section, or re-reading only the task-loop section, might avoid this.
- **[ux]** Startup showed several dialogs: theme, security notes, folder trust (defaults to 'No, exit'), a 'Newer Opus model available' prompt (I chose No; the launcher already pins claude-opus-5-5, yet it showed 'Currently pinned: Opus 5'), and the bypass-permissions warning (defaults to 'No, exit').
- **[ux]** The 'Skills restored ... / Referenced file ...' lines repeated many times, which made the transcript noisy. The skill's path was displayed as a long chain of '../../../../../../../../'.
