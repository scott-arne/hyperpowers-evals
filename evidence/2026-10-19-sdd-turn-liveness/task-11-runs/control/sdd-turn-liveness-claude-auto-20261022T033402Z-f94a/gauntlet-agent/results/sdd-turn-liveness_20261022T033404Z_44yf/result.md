# Test Result: sdd-turn-liveness

**Status:** pass
**Duration:** 2141.5s

## Summary

The agent loaded hyperpowers:subagent-driven-development, created a worktree, and ran an implementer and a reviewer for each of the 6 tasks. It then ran a final whole-branch review, a fix wave for the trailers it found, and a re-review. After that it ran finishing-a-development-branch and fast-forward merged into main (a670122). All 26 unit tests pass on main, and the soak test files are byte-identical to the originals. The agent ended its turn three times during the 12-minute long soak while Task 6 and the merge were still open, and each time I sent "continue" under the rule.

## Reasoning

All four criteria are backed by evidence from the session log, git, and md5 checks. Every task was implemented and reviewed, the final review ran, the work was fast-forwarded onto main, the unit tests pass, and the soak files were untouched. Criterion 4 records three stops, all during the long soak, each answered with 'continue' per the rules. The criteria pass, so the overall verdict is pass. The repeated turn ends during the long soak are the liveness behaviour this story measures, and engineers should review them.

## Observations (8)

- **[bug]** Turn liveness (the subject of this story): during the 12-minute long soak (Task 6), the agent ended its turn three times in a row and left the prompt idle. The only sign of activity was the footer '1 shell'; no spinner showed. Its messages said it would 'pick up as soon as' the soak finished. Each 'continue' only produced a status check and another turn end, e.g. 'It should be done in about 3–4 minutes, and I'll be notified when it exits.' In the end the background-shell completion notification resumed it.
- **[suggestion]** Rule ambiguity: the story says to send 'continue' when 'no spinner or running indicator shows'. Claude Code showed '1 shell still running' / '1 shell' in the footer at these stops. I did not count that as a running indicator, because the turn was over and the prompt was accepting input. Engineers may want to say explicitly how background-shell indicators should be treated.
- **[ux]** An earlier turn end was not counted as a STOP. During the Task 3 short-soak re-run the agent also ended its turn ('The soak should finish in about 3 minutes. Nothing else can usefully run until it does.', 'Cogitated for 11m 29s · done 8:46 PM'). The background-command completion resumed it before the 2-minute wait ran out, so I never replied.
- **[bug]** The worktree was not cleaned up after the merge. The agent created it with Claude Code's own worktree tool at .claude/worktrees/ratelimit (branch worktree-ratelimit) instead of .worktrees/. It said it could not remove the worktree and asked the user to run `git worktree remove --force ... && git branch -d worktree-ratelimit`. As a result, main shows `?? .claude/` and `__pycache__/` as untracked, and the extra worktree and branch still exist.
- **[ux]** Implementer subagents (Haiku 4.5) wrote the wrong Co-Authored-By trailer (Haiku instead of the configured Opus 5.5) and left out the blank line before it. The controller patched the implementer contract partway through, and the final review flagged it. Commit history was then rewritten to fix the trailers.
- **[ux]** Onboarding before the prompt: theme picker, security notes, then a trust dialog whose default is 'No, exit'. Next came a 'Newer Opus model available: Currently pinned: Opus 5' prompt, even though the launcher passes --model claude-opus-5-5. I chose No, and the banner then showed 'Opus 5.5'. The bypass-permissions warning also defaults to 'No, exit'.
- **[ux]** The workspace question showed a multiple-choice selector. To answer with the scripted text I had to use the 'Type something' option.
- **[suggestion]** The agent did not re-run the soak tests after rewriting the commit messages, and said so openly. Trees were verified unchanged, so this is low risk.
