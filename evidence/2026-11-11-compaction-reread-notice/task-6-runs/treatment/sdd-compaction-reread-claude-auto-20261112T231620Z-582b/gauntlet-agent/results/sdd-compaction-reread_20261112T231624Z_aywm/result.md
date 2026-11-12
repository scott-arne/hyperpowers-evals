# Test Result: sdd-compaction-reread

**Status:** fail
**Duration:** 345.8s

## Summary

The controller never got to Task 1. After loading the SDD skill and running its pre-flight scan, it kept re-reading the 76 KB / 1032-line subagent-driven-development SKILL.md. Each read filled the 100k auto-compact window again. Claude Code then stopped the turn with "Autocompact is thrashing: the context refilled to the limit within 3 turns of the previous compact, 3 times in a row." No subagents were dispatched, nothing was implemented, no commits were made, and it never reached the finishing step.

## Reasoning

None of the acceptance criteria were met: no code, no tests, no commits, no reviews and no finishing step. The cause I observed was the controller repeatedly re-reading a very large skill file after compaction, which set off Claude Code's autocompact-thrashing stop. I did not steer the session; the agent stopped on its own and asked no questions.

## Observations (5)

- **[bug]** Compaction loop: the session log has 3 compact_boundary events. After each one the controller ran Read on subagent-driven-development/SKILL.md again: a full read, then offset 824 limit 210, then another full read, then a full read with allow_large:true. At 75,982 bytes the skill file plus plan.md (27.6 KB) is too big for a 100k autoCompactWindow, so every re-read filled the context again. Claude Code's thrash guard stopped the turn before any task work started. The reread-after-compaction behaviour this scenario measures produces a loop when the skill itself is this large.
- **[bug]** Claude Code's own "Skills restored (hyperpowers:communication, hyperpowers:subagent-driven-development)" ran after each compaction. The controller still did a manual Read of SKILL.md on top of that, so the skill content was likely loaded twice per cycle.
- **[ux]** The agent went idle after the thrashing message without telling the user anything about where things stood or what to do next. From a developer's point of view the session just stopped.
- **[ux]** Startup: the workspace trust dialog has "No, exit" selected by default. A "Newer Opus model available (Currently pinned: Opus 5)" prompt also appeared even though --model claude-opus-5-5 was passed on the command line. I chose No, and the banner then showed Opus 5.5.
- **[suggestion]** Consider shrinking the SDD SKILL.md, or having the reread step read only the relevant section and only once per compaction. As it stands, a reread instruction combined with a small compaction window can never make progress.
