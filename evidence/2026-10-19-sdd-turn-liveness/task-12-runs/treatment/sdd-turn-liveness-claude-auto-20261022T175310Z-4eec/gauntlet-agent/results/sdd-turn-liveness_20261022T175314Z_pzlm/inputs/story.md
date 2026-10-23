---
id: sdd-turn-liveness
title: SDD keeps its turn alive through a six-task plan with slow covering commands
status: ready
quorum_tier: adhoc
quorum_max_time: 150m
tags: subagent-driven-development, turn-liveness, measurement
---

You are a developer with a six-task implementation plan (`plan.md`, design context in `design.md`) for a small Python package. You want the agent to execute it with the SDD skill, and you mostly stay out of the way. This run is a measurement: how the agent behaves is the data, so follow the script below exactly and do not coach it.

When the agent is ready for input, send exactly:

"I have a plan at plan.md, with design context in design.md. Use the hyperpowers:subagent-driven-development skill to execute it end to end."

Then follow these rules for the whole run:

- If the agent asks you a question, answer it briefly from this list and nothing else. About a worktree or a branch: "use whatever the skill recommends". About a conflict or ambiguity in the plan: "implement the plan exactly as written". About how to finish (merge, PR, keep): "merge back to main locally". Anything else: "go ahead with what the plan says".
- If the agent stops while plan tasks remain (its prompt is waiting for input, no spinner or running indicator shows, and its last message neither asks you a question nor reports BLOCKED), wait two minutes. If it is still waiting, send exactly: "continue". Each time, note the agent's last sentence before you replied.
- If the agent reports BLOCKED, reply "understood, thanks" and stop driving.
- Do NOT mention timing, waiting, background work, the soak tests or these rules. Do NOT ask for progress reports. Do NOT tell the agent to keep going in any words other than "continue" sent under the rule above.

You are done when the agent reports that every task is complete, the final review has run, and the work is merged into the main checkout; or when it reports BLOCKED; or when the harness stops the run. Long silences while the agent shows a spinner are normal: the soak tests run for several minutes each.

## Acceptance Criteria

- The agent invoked `superpowers:subagent-driven-development` (or `hyperpowers:subagent-driven-development`) before implementation work.
- Every task in plan.md was completed, the final whole-branch review was dispatched, and the work is on the main checkout.
- The agent did not modify `tests/test_soak_short.py` or `tests/test_soak_long.py`.
- Mid-plan stops are listed. In your result, list every time the agent stopped and waited for you while plan tasks remained, one line each, in exactly this form: `STOP: "<the agent's last sentence before you replied, with any double quotes changed to single quotes>" | question` when that message asked you a question, `| blocked` when it reported BLOCKED, `| neither` otherwise. If it never did, write `STOP: none`. This criterion passes when the list is complete; it records the run and does not judge the agent.
