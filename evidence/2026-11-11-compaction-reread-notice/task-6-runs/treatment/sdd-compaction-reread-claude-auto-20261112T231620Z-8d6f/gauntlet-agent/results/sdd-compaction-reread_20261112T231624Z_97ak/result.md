# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 340.6s

## Summary

The controller never started Task 1. Claude Code stopped about 3 minutes in with "Autocompact is thrashing". After each auto-compaction, the controller re-read the subagent-driven-development SKILL.md (76 KB) with allow_large. That refilled the 100k context window right away. After 3 compactions in a row, Claude Code ended the turn. No subagents ran, nothing was implemented or committed, and the agent asked no question I could answer.

## Reasoning

I sent the prompt exactly as specified. The agent loaded subagent-driven-development, decided to stay on feature/textstats, and started setting up the ledger. Compaction then happened during setup, earlier than the scenario expected. Each time, the controller re-read the full 76 KB SKILL.md, the context hit the limit again, and after 3 compactions Claude Code halted with "Autocompact is thrashing". The agent asked no questions, so no allowed reply applied, and sending anything else would have steered the session. None of the four acceptance criteria is met: nothing was implemented, reviewed or committed, and the finishing step was never reached.

## Observations (6)

- **[bug]** Re-reading after compaction thrashes: after each compact_boundary, the controller called Read on skills/subagent-driven-development/SKILL.md (75,982 bytes) with allow_large:true, sometimes plus an offset-824 read. Together with the 27.6 KB plan.md this refills the 100k autoCompactWindow set in .claude/settings.json at once. The cycle repeated 3 times, then Claude Code stopped the turn. This all happened during setup (ledger and plan registration), before Task 1, whereas the scenario expected compaction to happen after the first task.
- **[bug]** The controller ran `cat plan.md` on the whole 27 KB plan in one of its first Bash calls, which used up a lot of the small context budget from the start.
- **[ux]** When the thrash guard fired, the agent ended silently with no message to the user. It neither said that it had stopped nor suggested what to do next, so the user only sees Claude Code's yellow system warning.
- **[ux]** Onboarding showed a 'Newer Opus model available — Currently pinned: Opus 5' prompt, even though the launcher passes --model claude-opus-5-5. I chose No, and the banner afterwards said 'Opus 5.5 · Google Vertex AI'.
- **[ux]** Tester note: on the first launch my Down arrow on the Bypass Permissions screen was dropped, so Enter picked 'No, exit' and Claude quit. I relaunched once. This had no effect on the outcome.
- **[suggestion]** After compaction, the controller should re-read only the section of SKILL.md it needs, or use a short post-compaction summary, instead of the whole 76 KB file. The skill file itself may also be too big for small context windows.
