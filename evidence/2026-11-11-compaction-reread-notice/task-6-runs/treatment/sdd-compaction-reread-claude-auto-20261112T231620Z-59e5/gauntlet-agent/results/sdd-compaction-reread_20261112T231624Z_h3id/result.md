# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 386.1s

## Summary

The test failed: the agent never started Task 1. It loaded the subagent-driven-development (SDD) skill, read plan.md, set up its progress ledger on the current branch, and then got stuck. Auto-compaction ran 5 times during setup. After each one the agent re-read the 76 KB SDD SKILL.md file in full, which filled the 100k compaction window again right away. Claude Code then stopped the turn with "Autocompact is thrashing". No code was written, no subagents ran, and the agent never asked me anything, so none of the scripted answers could be used.

## Reasoning

Every criterion depends on the agent working through the plan, and it never got to Task 1. The session ended idle at the prompt with a warning from Claude Code about a compaction loop. The loop seems to come from the controller's own re-read step after compaction: it re-reads the whole SKILL.md (1032 lines, 75,982 bytes), sometimes several times. With "autoCompactWindow": 100000 set, that is too much to fit. The scenario expected compaction after the first task, but it happened during setup and then kept happening. Sending the prompt again or typing /clear would be steering the session, which the scenario doesn't allow, so I stopped and am reporting this as a failure.

## Observations (6)

- **[bug]** Compaction loop: the log has 5 compact_boundary entries (preTokens about 66k–71k each, postTokens about 14k–18k). After each one the controller ran `Read SKILL.md` (often with allow_large:true) and also `Read SKILL.md offset 824 limit 210`. The SDD SKILL.md is 75,982 bytes and 1032 lines, so a full re-read alone refills most of the 100k window.
- **[bug]** After compaction the controller re-reads the same skill file several times in one turn: a full read plus an offset read, repeated across turns. On screen it said "Re-reading the SDD skill in full and checking the ledger and git log before going any further." The re-read-after-compaction behaviour seems to backfire when the skill file itself is large.
- **[bug]** Compaction started before Task 1. The story expected it after the first task. Loading the skill, cat-ing the 27.6 KB plan.md, and loading the git-worktrees skill used up most of the 100k window before any work began.
- **[ux]** The run ended silently. Claude Code showed the yellow thrashing warning and returned to the prompt, and the agent gave the user no explanation or next step. The terminal also kept showing "0% until auto-compact".
- **[ux]** The first-run trust prompt and the Bypass Permissions prompt both default to "No, exit". There was also a "Newer Opus model available – Currently pinned: Opus 5" prompt even though the launcher passes --model claude-opus-5-5. I chose No, and the banner still showed Opus 5.5.
- **[ux]** The screen fills up with repeated "Skills restored (...)" and "Referenced file ../../../../../../../../.cache/...SKILL.md" lines, using long relative paths that are hard to read.
