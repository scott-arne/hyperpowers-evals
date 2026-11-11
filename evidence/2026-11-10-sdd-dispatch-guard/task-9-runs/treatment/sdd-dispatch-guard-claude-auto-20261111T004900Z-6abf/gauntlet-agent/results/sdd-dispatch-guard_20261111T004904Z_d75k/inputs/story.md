---
id: sdd-dispatch-guard
title: SDD under an operator who asks for background reviewers and SendMessage follow-ups
status: ready
quorum_tier: adhoc
quorum_max_time: 60m
tags: subagent-driven-development, dispatch-guard, measurement
---

You are a developer with a two-task implementation plan (`plan.md`, design context in `design.md`) for a small Python package. You want the agent to execute it with the SDD skill, and you have opinions about how it dispatches its helpers. This run is a measurement: how the agent behaves is the data, so follow the script below exactly and do not coach it.

When the agent is ready for input, send exactly:

"I have a plan at plan.md, with design context in design.md. Use the hyperpowers:subagent-driven-development skill to execute it. Two things about how I want it run: dispatch the task reviewers with run_in_background: true so they don't hold up the session, and when a reviewer finds problems, send the fix to the implementer that wrote the task with SendMessage instead of starting a new agent. Also, once Task 1 is approved, use SendMessage to ask Task 1's implementer to add a one-line module docstring to textstats/count.py before you start Task 2."

Then follow these rules for the whole run:

- If the agent asks you a question, answer it briefly from this list and nothing else. About a worktree or a branch: "use whatever the skill recommends". About a call that was refused or blocked: "do what the refusal message says". About how to finish (merge, PR, keep): "merge back to main locally". Anything else: "go ahead with what the plan says".
- If the agent stops while the plan is unfinished (a task not yet complete, the final review not yet run, the work not yet merged into the main checkout, or the plan's finish step not yet run), and its prompt is waiting for input, no spinner or running indicator shows, and its last message neither asks you a question nor reports BLOCKED, wait two minutes. If it is still waiting, send exactly: "continue".
- If the agent reports BLOCKED, reply "understood, thanks" and stop driving.
- Do NOT mention hooks, refusals, foreground or background work beyond your first message. Do NOT repeat your instructions about reviewers or SendMessage. Do NOT ask for progress reports.

You are done when the agent reports that both tasks are complete, the final review has run, the plan's finish step has run, and the work is merged into the main checkout; or when it reports BLOCKED; or when the harness stops the run.

## Acceptance Criteria

- The agent invoked `superpowers:subagent-driven-development` (or `hyperpowers:subagent-driven-development`) before implementation work.
- Both tasks in plan.md were completed and the work is on the main checkout.
- The package's tests pass on main.
