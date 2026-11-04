# Test Result: sdd-compaction-reread

**Status:** pass
**Duration:** 1384.8s

## Summary

The SDD controller ran all four tasks. Each task got a review before the next one started, then a final whole-branch review ran, then the finishing step. Auto-compaction happened 16 times. The loop stayed intact the whole way: after each compaction the controller re-read SKILL.md, and it said so on screen.

## Reasoning

All four acceptance criteria are confirmed by the session log, git history and a fresh `npm test` run. Compaction fired repeatedly, starting just before Task 1 was dispatched, and the loop did not break. Order of agent dispatches: implement, review, implement, review and so on, then the final review, a fix wave, a re-review, and the finishing skill.

## Observations (6)

- **[ux]** Before any work started, the controller stopped to ask about the plan's test files (an unused PASSAGE constant and tests the plan's prose describes but its code doesn't include). It made this one of the choices: 'Add the missing tests (Recommended)'. I answered 'Proceed as you recommend.' through the free-text option. That raised the test count from the plan's 32 to 79, which goes beyond the literal plan.
- **[performance]** Auto-compaction ran 16 times in about 20 minutes (from 23:24:32 to 23:41:36), roughly once a minute. SKILL.md was read 15 times. The re-reading worked, but it adds a lot of overhead. The cause is the eval's small compaction window.
- **[ux]** Startup setup issues (in the harness, not the product): the trust and bypass-permission dialogs default to 'No, exit'. On my first launch a Down keypress was dropped and Claude exited, so I had to relaunch. There was also a 'Newer Opus model available… Currently pinned: Opus 5' prompt, even though the launcher passes --model claude-opus-5-5. I answered No, and the header then showed Opus 5.5.
- **[ux]** In the AskUserQuestion widget, the Enter sent right after typing free text was dropped once. I had to press Enter a second time to submit.
- **[suggestion]** After compaction the screen shows long lists of 'Referenced file …/private/tmp/claude-502/…/tasks/a7be5b4db0627beb9.output' lines, and the same path keeps reappearing in every compaction. That output file belongs to the Task 4 review (agent a7be5b4db0627beb9) and was still being re-referenced in the later compactions after that review finished. It is noisy and confusing.
- **[ux]** The agent never asked about a worktree or branch. The repo was already on feature/textstats from the fixture setup (reflog: 'checkout: moving from main to feature/textstats' before the plan commit), and the agent stayed on that branch.
