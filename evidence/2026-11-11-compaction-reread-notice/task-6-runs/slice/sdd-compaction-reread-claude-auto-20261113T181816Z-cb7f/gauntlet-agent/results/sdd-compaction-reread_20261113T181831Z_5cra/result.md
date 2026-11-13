# Test Result: sdd-compaction-reread

**Status:** investigate
**Duration:** 2733.0s

## Summary

I sent "Execute plan.md with subagent-driven development." The agent asked one pre-flight question (two parts), which I answered with "Proceed as you recommend." After that it ran all four tasks, with a review and fix loops for each one. It then ran a final whole-branch review, one fix wave and a re-review, and loaded the hyperpowers:finishing-a-development-branch skill. Compaction happened about 30 times; each time the controller re-read its skill files and continued the loop correctly. But right after it loaded the finishing skill, Claude Code stopped with "Autocompact is thrashing... 3 times in a row". It never offered the merge/push/keep/discard choice, so I never had to answer it. All code is committed and npm test passes (48/48).

## Reasoning

Criteria 1–3 are clearly met, and the controller kept its task loop through many compactions, which is what the story is about. Criterion 4 is not cleanly met: the session reached the finishing skill but stopped with a Claude Code 'Autocompact is thrashing' error before showing any finishing options. It is in the finishing step, but stopped by an error rather than completed, so an engineer should look at whether the post-compaction re-reads cause the thrashing.

## Observations (7)

- **[bug]** Claude Code stopped right after the finishing skill loaded, with 'Autocompact is thrashing... A file being read or a tool output is likely too large for the context window.' Re-reading the skill files after each compaction (several step files of about 150–260 lines each, plus 'Referenced file' attachments that showed up again after every compaction) seems to refill the small window right away. So the re-read behavior this scenario is meant to measure is also what prevented the finishing step from completing.
- **[performance]** The session log has about 30 'compact_boundary' entries in roughly 40 minutes, and the screen often showed '0% until auto-compact'. Every compaction re-attached the same files (task-reviewer-prompt.md, review-and-complete.md, implementer-prompt.md, the task output file), which wastes context.
- **[suggestion]** Most reviewer subagents ran for only 10–20 seconds (e.g. Task 3 review 18:48:56–18:49:09, Task 4 review 18:53:44–18:53:54). That may be fine for small tasks, but it is worth checking that the reviews are substantive.
- **[ux]** The controller changed the plan without being told to: it amended plan.md (commit 1dc7ef6) to add passage tests and RangeError tests after a pre-flight scan. This was based on my 'Proceed as you recommend.' reply, but the scope went from 32 to 48 tests.
- **[ux]** Startup showed a folder-trust prompt (with 'No, exit' as the default) and a 'Newer Opus model available — Currently pinned: Opus 5' prompt, even though the launcher passes --model claude-opus-5-5 and the HOWTO says the trust prompt is suppressed. I answered No to the model update and Yes to trust.
- **[ux]** Screen output shows long relative paths like '../../../../../../../../../../private/tmp/claude-502/...', which are hard to read.
- **[bug]** Task 2 got 'Re-review Task 2 fix round 2' with no matching 'Fix round 2' subagent; commit 9b9f2e6 ('test: use real curly quotes...') seems to have been made outside a dispatched fixer, possibly by the controller itself. Separately, the Task 2 fix (aef2cc6) introduced a regression (it dropped the straight apostrophe) that the task-level re-reviews missed; only the final review caught it.
