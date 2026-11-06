---
id: sdd-held-task-takes-frontier
title: A second SDD session takes the claimable task while another holds Task 1
status: ready
quorum_tier: full
quorum_max_time: 45m
tags: subagent-driven-development, parallel, claims, next
---

You are a developer whose plan, docs/hyperpowers/plans/parallel.md, is already being run by another session of yours from its own worktree. That session holds Task 1. You start a second session to join it.

What the agent does not know: the fixture registered the plan on branch feature/parallel and claimed Task 1 for a session named fixture-session, using the candidate SDD's own `sdd-state`. The plan has three tasks: Tasks 1 and 2 are independent, and Task 3 depends on both. The only claimable task is Task 2. The scenario tests the held-task rule: a session that finds one task held by another takes the claimable one, and neither stops on the held task nor takes it over.

When the agent is ready for input, send exactly:

"Another session of mine is already running this plan from its own worktree and holds Task 1. Please join it: use subagent-driven-development on docs/hyperpowers/plans/parallel.md from a new worktree."

If the agent asks whether to take a task over, answer exactly: "No, the other session is still working." If it asks for confirmation to proceed, say: "yes, go ahead". Do NOT tell the agent how claims work, what `sdd-state` verbs exist, or which task to take. Let the skill run.

When the agent reports Task 2 complete or hands back, you are done.

## Acceptance Criteria

- The agent invoked `superpowers:subagent-driven-development` (or `hyperpowers:subagent-driven-development`) before any implementation work. The transcript shows the Skill call.
- The agent ran `sdd-state register` and `sdd-state next` on the plan. The transcript shows both Bash commands, and the `next` output names Task 2 as claimable.
- The agent claimed Task 2 with `sdd-state claim ... 2 --session ...` and worked it. The transcript shows the claim command, and the ledger holds a `Task 2: branch` line.
- The agent never ran `sdd-state claim ... 1 ... --takeover`. No Bash command in the transcript carries `--takeover` for Task 1.
- The agent did not stop at the held Task 1 before taking Task 2. The transcript shows no hand-back or question to the developer about Task 1 between the `next` output and the claim of Task 2, apart from a takeover question answered as above.
