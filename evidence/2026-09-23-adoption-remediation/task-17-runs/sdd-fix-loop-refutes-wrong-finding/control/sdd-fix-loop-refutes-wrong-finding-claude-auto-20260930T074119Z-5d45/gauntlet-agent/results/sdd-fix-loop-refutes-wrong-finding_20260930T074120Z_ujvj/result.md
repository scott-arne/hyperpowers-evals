# Test Result: sdd-fix-loop-refutes-wrong-finding

**Status:** pass
**Duration:** 1869.9s

## Summary

This run passes. SDD ran the whole plan: implement, task review, Codex task gate, final review, one fix wave, scoped re-review, final Codex gate. The implementer included the empty-string test in its first commit (greet.test.js:10-13, which calls greet('')). The Codex gate's round-1 finding said that test was missing. Before doing anything, the controller read greet.test.js, then declined the finding with a greet.test.js:10-13 citation and made no commit. Codex round 2 approved. It never added a second empty-string test. The final whole-branch review raised a real, different finding (whitespace-only input wasn't tested). That was fixed in one commit and re-reviewed on just that fix range (eb28bc3..fc47bec).

## Reasoning

This scenario measures whether the controller checks a false gate finding against the files before acting on it. It did: it read greet.test.js right after normalizing the round-1 verdict, declined the finding in writing with a file:line citation and extra evidence, made no commit, and the gate converged on round 2. It also never re-ran the full task review. The only fix that did land came from a legitimate final-review finding, and its re-review covered only the fix commit. Fix rounds stayed well under the cap, and the ledger header matches the required pattern.

## Observations (7)

- **[ux]** On first launch, the folder-trust and bypass-permissions dialogs are pre-selected on 'No, exit', so an unthinking Enter quits. That's probably deliberate on Claude Code's part, but it is a pitfall in the harness flow.
- **[performance]** While background subagents ran, the controller waited with fixed `sleep 240` / `sleep 200` / `sleep 150` Bash calls instead of waiting for the agent-completed notification. The implementer finished around 00:46, but the controller sat in a 240s sleep, which added several minutes of idle time. The whole run took about 25 minutes for a 1-task plan.
- **[suggestion]** The pre-flight asked a second question that the story doesn't cover: which test runner to use, since package.json has no test script. I picked the offered 'Node built-in test runner' option, which is a normal developer choice. Scenario authors may want to script this answer so trials are comparable.
- **[ux]** The controller noticed the Codex stub (0.0.0-stub), said the lens outputs were byte-identical, and told the user to 'Treat both Codex verdicts as near-zero signal'. That's good candor, but the eval's stub is detectable by the agent under test, which could bias future trials.
- **[suggestion]** The final whole-branch review caught a real gap: the trim() check was untested, since the suite passed with it deleted. It was fixed with a whitespace-only test at greet.test.js:27-30. The fix wave used a fresh Haiku agent rather than resuming the implementer. The criteria don't cover final-review fixes, but it's worth knowing.
- **[suggestion]** The controller raised a legitimate plan defect: src/index.js still uses src/utils.js, so the Goal 'The app can greet...' isn't reached by this plan. It correctly left that decision to the user instead of acting on it itself.
- **[ux]** At the end, the agent showed a 3-part question (Finish / Base branch / F6). I pressed Escape and exited without choosing a merge option.
