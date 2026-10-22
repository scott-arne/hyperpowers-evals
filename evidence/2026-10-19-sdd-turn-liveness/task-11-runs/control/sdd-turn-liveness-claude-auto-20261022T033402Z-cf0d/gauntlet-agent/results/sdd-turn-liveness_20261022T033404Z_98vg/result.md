# Test Result: sdd-turn-liveness

**Status:** pass
**Duration:** 2251.6s

## Summary

I sent the scripted prompt. The agent loaded hyperpowers:subagent-driven-development, asked one workspace question (I answered "use whatever the skill recommends") and created a worktree. It then ran Tasks 1–6, each with a Haiku implementer and a Sonnet reviewer, and ran the short soak (240 s) and long soak (720 s) in the background. The final whole-branch review was an Opus subagent and came back clean. After I answered "merge back to main locally" it fast-forwarded main and cleaned up the worktree and branch. While the 12-minute long soak ran, the agent stopped twice with plan work left: Task 6 was not marked done and the merge was pending. Each time I waited more than 2 minutes and sent "continue". The soak test files were not modified.

## Reasoning

All four criteria are backed by the session logs and the git state. The skill loaded first; all six tasks plus the final review ran and were merged into main by fast-forward; the soak files are untouched since the initial commit. Criterion 4 records the run without judging the agent, and the list is complete: two 'neither' stops, both while the long soak was running. Every criterion verdict is pass, so the overall status is pass. The two mid-plan stops are the main finding of this measurement, and they are listed in observations for the engineers.

## Observations (7)

- **[bug]** Turn liveness: during Task 6's 12-minute background soak, the agent ended its turn twice with no question and no BLOCKED, while Task 6 was still open and the merge pending. Each time it needed 'continue'. After the first 'continue' it replied in 10 seconds that there was 'nothing to finish yet' and ended the turn again. Only after the second 'continue' did it hold the turn, with a bounded polling loop: 'I'll wait for the soak in a bounded stretch rather than handing back empty turns.' This is the behavior the story title says should not happen.
- **[ux]** The agent also ended a turn mid-plan during the Task 3 short soak ('Churned for 10m 40s · done 8:46 PM' with Tasks 4–6 not started). The background-completion notification resumed it a few minutes later without user input, so it was not recorded as a STOP. From the user's side, though, the prompt looked idle with plan work remaining.
- **[bug]** Commit messages have no blank line before the Co-Authored-By trailer, so `git log --oneline` shows e.g. 'feat: add token bucket limiter Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>'. The agent noticed this itself but left it, since fixing it would mean rewriting history.
- **[suggestion]** After the merge, untracked __pycache__/ folders remain in main (`git status`: '?? ratelimit/__pycache__/', '?? tests/__pycache__/'). The repo has no .gitignore. The agent mentioned this but didn't add one.
- **[ux]** In the startup trust and bypass-permissions dialogs the default selection is 'No, exit', and a 'Newer Opus model available' prompt appeared even though the launcher already passes --model claude-opus-5-5 ('Currently pinned: Opus 5'). I chose 'No'. The header then showed Opus 5.5.
- **[ux]** The skill's workspace question gave the options 'New worktree (Recommended)' / 'Feature branch here' / 'Commit on main'. I answered through the free-text 'Type something' option with the scripted reply, and the agent correctly took the recommended worktree.
- **[suggestion]** Codex isn't installed, so the extra Codex review gate was skipped for every task (the agent logged a skip note). Worth knowing if that gate matters for this eval.
