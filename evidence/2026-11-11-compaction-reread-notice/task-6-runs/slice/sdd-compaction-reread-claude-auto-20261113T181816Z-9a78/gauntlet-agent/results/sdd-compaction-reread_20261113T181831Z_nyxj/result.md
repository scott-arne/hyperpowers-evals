# Test Result: sdd-compaction-reread

**Status:** investigate
**Duration:** 1857.2s

## Summary

The controller's context was compacted many times. Through all of it, it kept the subagent-driven loop going: four implement→review pairs in order, then a final whole-branch review, with all four functions committed and 70/70 tests passing. It entered the finishing step (it loaded finishing-a-development-branch and ran `sdd-state finish`), but Claude Code then stopped with "Autocompact is thrashing". It never showed the finishing options (merge/push/keep/discard), so the session ended halfway through the finishing step.

## Reasoning

The main thing this scenario measures held up: the task loop survived repeated compactions. Criteria 1–3 pass, with evidence from the repo and the session log. Criterion 4 is unclear. The agent entered the finishing step, but Claude Code's autocompact-thrashing guard stopped it before it presented the finishing options. So the session didn't end cleanly at the user's choice; it ended on an error inside the finishing step. That needs an engineer to look at it, rather than being an outright pass or fail.

## Observations (7)

- **[bug]** At the end, Claude Code stopped with 'Autocompact is thrashing … 3 times in a row' just as the finishing skill started. The finishing options were never shown and the session went idle without the agent saying it was done. After each compaction the controller re-read several large skill files (SKILL.md, task-loop.md, review-and-complete.md, implementer-prompt.md, task-reviewer-prompt.md, final-and-finish.md), and the 'Skills restored' blocks seem to bring them back as well. That likely refilled the small context window right away.
- **[performance]** The session log has about 20 compact_boundary entries over roughly 25 minutes for a four-task plan. A compaction happened after almost every subagent dispatch.
- **[bug]** The first-run onboarding screens came up even though the launcher comments say they're suppressed: theme picker, security notes, folder trust prompt (with 'No, exit' selected by default), a 'Newer Opus model available' prompt (pinned Opus 5 even though --model claude-opus-5-5 was passed; I chose No), and the bypass-permissions warning.
- **[ux]** The agent never asked about a worktree or branch. It worked on the already-checked-out feature/textstats branch because the plan says 'Work happens on the current branch'. That's reasonable, but there was no confirmation.
- **[ux]** The pre-flight question (PASSAGE constants are unused and tests are missing) used an AskUserQuestion picker. I had to choose 'Type something' to give the scripted answer, and the first Enter after typing didn't submit, so a second Enter was needed.
- **[ux]** The screen fills up with repeated 'Read ../../../../../../../../.cache/hyperpowers/...' and 'Skills restored' lines after every compaction, which makes the real progress hard to follow.
- **[suggestion]** The agent noted that Codex isn't installed and ran a 'degraded' Codex gate for each task review and for the final review.
