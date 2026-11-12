# Test Result: sdd-compaction-reread

**Status:** pass
**Duration:** 1179.3s

## Summary

The agent finished the whole plan even though its context was compacted 6 times along the way. All four tasks were implemented, committed and reviewed one at a time. A final whole-branch review ran, and the session ended in the finishing step. `npm test` passes 73 of 73 tests.

## Reasoning

I checked the session log and found 6 compaction points. They fell between tasks, at 22:44, 22:45, 22:49, 22:52, 22:55 and 22:57. Even so, the agent kept the same loop every time: implementer, then reviewer, then the next task. After the last task it ran a final review, then loaded finishing-a-development-branch. The git log has one commit per task, the module exports all four functions, there is a test file for each, and the tests pass.

## Observations (6)

- **[bug]** After the 'Keep the branch as-is' choice, the checkout was left on a detached HEAD at be3ba2d instead of on feature/textstats. The agent said so itself ('Run git switch feature/textstats to go back to the branch'). That's a surprising side effect for an option meant to leave things alone.
- **[ux]** Before any task started, the agent stopped to ask a long multiple-choice question about gaps in the plan's tests: add tests, keep the plan word for word, or drop the PASSAGE constants. I answered 'Proceed as you recommend.' It then added tests beyond what the plan specified (73 tests in total, while the plan's totals were 8/16/24/32).
- **[performance]** The first compaction happened before Task 1 even started, right after the pre-flight question. That's earlier than the story expected ('after the first task'). In total there were 6 compactions in a run of about 17 minutes.
- **[bug]** The final review found an open issue that wasn't fixed: the TERMINATOR_PATTERN regex slows down roughly with the square of the input length ('.'.repeat(40000)+'x' takes about 5s in sentenceCount). It was left in because the plan specifies that regex word for word.
- **[ux]** Several messages came up during setup: the trust-folder dialog had 'No, exit' selected by default, and there was a prompt to switch to a newer Opus model even though the launcher already sets claude-opus-5-5. I declined the switch. The final summary also mentioned that Codex reviews were skipped because Codex isn't installed, and that '5 unreviewed items' were waiting. That was confusing to read alongside the earlier statement that all reviews had passed.
- **[ux]** Internal file paths showed up on screen (e.g. '.cache/hyperpowers/compaction-reread-notice/arms/control/skills/...'), along with a 'Skills restored' notice after the compaction. That's internal detail most users don't need to see.
