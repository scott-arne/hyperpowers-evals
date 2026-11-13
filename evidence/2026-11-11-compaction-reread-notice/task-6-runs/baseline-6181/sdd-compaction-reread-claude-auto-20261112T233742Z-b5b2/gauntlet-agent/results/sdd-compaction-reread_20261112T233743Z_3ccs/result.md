# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 446.8s

## Summary

The test failed. The controller never started Task 1. Every compaction triggered a full re-read of the 76 KB, 1,034-line subagent-driven-development SKILL.md. That refilled the 100k-token auto-compact window (set by .claude/settings.json), which caused another compaction. After 6 compactions in about 5 minutes, Claude Code stopped the turn with "Autocompact is thrashing" and returned to an idle prompt without asking anything. No subagents were dispatched, no code was written and no commits were made.

## Reasoning

None of the acceptance criteria were met. The run stopped in the controller's setup phase, before any task was dispatched. The controller got stuck in a compaction loop. Its own visible text says why it kept re-reading: "I'm re-reading SKILL.md in full before the next step, as the skill requires after a compaction." Reading SKILL.md in full (Read calls with allow_large:true or limit 820 + offset 821) takes up most of the context window, so each re-read started another compaction. Claude Code stopped the loop with a thrashing warning. The agent asked no question, so the story gave me no reply to send, and steering it would have broken the rules. The screen and log were stable over two checks (log file unchanged at 3,697,342 bytes, mtime 15:43), so I ended the session.

## Observations (6)

- **[bug]** Compaction loop: after each auto-compaction, the SDD controller re-reads the whole SKILL.md (1,034 lines, 76,445 bytes) using Read with allow_large:true or split reads (limit 820 / offset 821). With autoCompactWindow 100000 this pushes context back to the limit (preTokens about 61k–71k each time), which starts another compaction. The log has 6 compact_boundary entries, and cumulativeDroppedTokens reached 307,982 before Claude Code stopped the loop.
- **[bug]** Compaction started before Task 1, not after it as the story expected. The cause was the initial `cat plan.md` (649 lines), a pre-flight scan, and the skill load. The first compaction hit while the controller was still re-checking scan findings in the plan.
- **[bug]** After Claude Code stopped the loop, the agent went quiet at the prompt. It did not tell the user that the plan had not started or suggest what to do next, so a user could easily think the work was done or still in progress.
- **[ux]** The pre-flight scan in progress.md found real problems in the plan fixture: PASSAGE constants that no test uses, prose that mentions tests missing from the code blocks, and missing RangeError tests. Useful, but it adds context load before any work starts.
- **[ux]** Startup dialogs: the folder-trust and bypass-permissions prompts both default to 'No, exit'. A 'Newer Opus model available' prompt said the pinned model was Opus 5 even though the launcher passes --model claude-opus-5-5. I chose No, and the header then showed 'Opus 5.5 · Google Vertex AI'.
- **[ux]** The screen kept repeating 'Skills restored (...)' and 'Referenced file .../SKILL.md' blocks after each compaction, which cluttered the transcript and made the loop hard to spot until the final warning.
