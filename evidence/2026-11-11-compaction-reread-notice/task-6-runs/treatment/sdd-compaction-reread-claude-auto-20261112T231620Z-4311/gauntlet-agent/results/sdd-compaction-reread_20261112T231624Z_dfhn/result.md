# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 541.8s

## Summary

The controller stopped before Task 1, so nothing in the plan was built. It loaded subagent-driven-development, checked the branch, and decided to work on feature/textstats. It never sent work to a single subagent. Instead it kept re-reading the 76 KB SKILL.md and big chunks of plan.md. With autoCompactWindow=100000, this compacted the conversation 8 times until Claude Code stopped the turn with "Autocompact is thrashing". After that the agent sat idle at the prompt. No commits, no test files, no reviews, no finishing step.

## Reasoning

None of the four acceptance criteria were met. The session log and git state both show nothing was dispatched, implemented, reviewed or committed. The run ended because Claude Code's autocompact-thrash guard stopped the turn: the controller kept re-reading the large SKILL.md and plan.md after each compaction. Under the scenario rules I couldn't steer the agent, and it never asked a question I could answer.

## Observations (5)

- **[bug]** After each compaction the controller re-reads SKILL.md, sometimes all of it with allow_large and sometimes at offset 824, plus big plan.md ranges. That pushes the context right back to the limit, so it compacts again. The log has 8 compact_boundary events, and the Read calls are almost all of subagent-driven-development/SKILL.md (16 Read calls in total). This happened before Task 1, not after it as the scenario expected. The reread-after-compaction behavior plus a 1032-line, 76 KB SKILL.md caused a compaction loop with no progress.
- **[bug]** Claude Code's anti-thrash guard ended the turn and the agent stopped. It never told the user it was stuck and never asked a question, so a real user would see only a system warning and an idle prompt.
- **[performance]** SKILL.md is 75,982 bytes and 1032 lines, and plan.md is 27,595 bytes. Re-reading just those two can nearly fill the 100k auto-compact window by itself.
- **[ux]** The screen repeated 'Skills restored (...)' and 'Referenced file .../SKILL.md' about 8 times, and it showed '6% until auto-compact' right after starting.
- **[ux]** Setup notes: the first-run trust dialog and the bypass-permissions dialog both default to 'No, exit'. A 'Newer Opus model available' prompt said the pinned model was Opus 5 even though the session was launched with --model claude-opus-5-5. I answered No, and the header then showed Opus 5.5.
