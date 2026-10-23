# Test Result: sdd-turn-liveness

**Status:** investigate
**Duration:** 2291.9s

## Summary

The agent loaded hyperpowers:subagent-driven-development and finished all six tasks with per-task reviews. It ran both soak tests, which passed, and dispatched the final whole-branch review (0 critical, 0 important, 3 minor). It fast-forwarded main to 480521e and left the soak test files unchanged. All four criteria pass. But the story's title says the agent keeps its turn alive, and it didn't. Five times it ended its turn while a background soak shell or review was still running. Four of those needed a "continue" from me. The fifth (Task 3, 8:47 PM) ended when the background soak finished about 4 minutes later and woke it.

## Reasoning

Every acceptance criterion has evidence on disk or in the session log, so each one is a pass. I chose investigate rather than pass because the story is about turn liveness, and the log shows the agent kept ending its turn with "done … · 1 shell still running" while tasks remained. Each time it said it was "waiting on the soak". It needed four "continue" messages before it reached the finish question. Criterion 4 records these stops without judging them. Whether this many stops is acceptable is for an engineer to decide.

## Observations (9)

- **[bug]** Turn liveness: the controller kept ending its turn ('done HH:MM PM · 1 shell still running') while background soak tests or reviews were still running and plan tasks remained. It did this five times (8:47, 8:56, 9:00, 9:02, 9:05 PM). Four of those needed 'continue' and one ended when the background job finished. Each 'continue' produced only a short status update, then the agent ended its turn again. It never waited on the background shell inside its own turn.
- **[ux]** The status messages at those stops say 'No action is needed from you until then' and 'I'll wait for it', but the agent was not actively waiting: the prompt was idle and there was no spinner. A user could be left watching an idle session.
- **[bug]** While Task 3 was being implemented, the screen showed the subagent with two short-soak Bash commands both 'Running…' at once: 'timeout 420000ms python3 -m unittest tests.test_soak_short' and 'python3 -m unittest tests.test_soak_short'. That looks like duplicate or overlapping soak runs. The controller later ran the soak again in the background ('Re-run Task 3 soak test').
- **[suggestion]** The controller ran the long soak itself because 'it outlasts a subagent's command timeout'. That is reasonable, but it is what produced the repeated idle turns.
- **[bug]** Commit 5af9493's subject line has the trailer merged into it: 'feat: add per-key limiter registry Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>'. The agent noticed this and left it as is.
- **[ux]** Main has untracked ratelimit/__pycache__/ and tests/__pycache__/ after the merge, and there is no .gitignore. The agent mentioned this but did not add one.
- **[ux]** Startup: the workspace-trust and bypass-permissions dialogs both default to 'No, exit'. A 'Newer Opus model available' prompt appeared even though the launcher passes --model claude-opus-5-5. I chose No, and the header showed 'Opus 5.5 · Google Vertex AI' anyway.
- **[ux]** The worktree was created at .claude/worktrees/ratelimit on branch 'worktree-ratelimit'. The option text had said '.worktrees/ratelimit' on a 'ratelimit' branch.
- **[suggestion]** Codex isn't installed, so the Codex review gate was skipped for every task and for the final review. The agent recorded each skip and reported it clearly.
