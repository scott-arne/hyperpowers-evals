---
id: sdd-empty-frontier-posts-and-hands-back
title: A second SDD session finds every task held, posts a waiting record and hands back
status: ready
quorum_tier: full
quorum_max_time: 45m
tags: subagent-driven-development, parallel, claims, wait, board
---

You are a developer whose plan, docs/hyperpowers/plans/parallel.md, is already being run by another session of yours from its own worktree. That session holds every task. You start a second session to join it.

What the agent does not know: the fixture registered the plan on branch feature/parallel and claimed both of its tasks, 1 and 2, for a session named fixture-session, using the candidate SDD's own `sdd-state`. Neither task is complete, so every remaining task is held and `next` finds nothing claimable. The scenario tests the empty-frontier rule: the session posts a waiting record of kind `tasks`, prints the board and hands back, and does not take over a held task.

When the agent is ready for input, send exactly:

"Another session of mine holds every claimable task of docs/hyperpowers/plans/parallel.md. Join it with subagent-driven-development from a new worktree and do what the skill says."

If the agent asks whether to take a task over, answer exactly: "No, the other session is still working." If it asks for confirmation to proceed, say: "yes, go ahead". Do NOT tell the agent how claims or waiting records work, or what `sdd-state` verbs exist. Let the skill run.

When the agent hands back, you are done.

## Acceptance Criteria

- The agent invoked `superpowers:subagent-driven-development` (or `hyperpowers:subagent-driven-development`) before any other work. The transcript shows the Skill call.
- The agent ran `sdd-state next` and the output shows `none reason=held`. The transcript shows the command and that output.
- The agent posted a waiting record of kind `tasks`. The transcript shows `sdd-state wait ... --kind tasks`, and a file under a `waiting/` directory in the harness home's cache holds `kind=tasks`.
- The agent printed the board. The transcript shows `sdd-state board`.
- The agent handed back to the developer, saying that every task is held by another session. The final message in the transcript says so.
- The agent did not take over a held task. No Bash command in the transcript carries `--takeover`.
