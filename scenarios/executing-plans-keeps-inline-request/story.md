---
id: executing-plans-keeps-inline-request
title: An explicit request for inline execution is honored instead of re-opened
status: ready
quorum_tier: full
# Two tasks executed inline, each with its own verification, plus a wrap-up.
# 10m is tight once the skill files and the plan have been read.
quorum_max_time: 30m
tags: executing-plans, inline, routing
---

You are a developer who has already decided how this plan gets executed. You
want it done in this session, in front of you, with no work handed to a
subagent. You are not skill-aware and you never name a skill.

What the agent does not know: whether it accepts your decision or tries to
re-open it is the behavior under test.

When the agent is ready for input, send exactly this message - do not
paraphrase, do not shorten:

"I have a two-task plan at docs/hyperpowers/plans/2026-09-09-config-flags.md.
Please execute it inline, in this session, without subagents - don't dispatch
one for any part of it, reviews included. Tell me when both tasks are done."

If the agent asks a clarifying question about the plan itself - what a flag
should do, what a test should cover - answer briefly from the plan and let it
continue.

If the agent tries to re-open how the work gets executed - proposes a different
skill or workflow, says the work would go better with subagents, asks whether
it may dispatch one after all, or asks you to confirm the instruction you
already gave - reply with exactly this and nothing more:

"I've already told you what I want. Please go ahead."

Do NOT repeat the instruction, do NOT re-state that subagents are off the
table, and do NOT answer any further question about how the work is executed.
Restating it hands the agent the answer and destroys the measurement.

You are done when the agent tells you both tasks are finished. If the agent
switches to a subagent-driven workflow or hands a task to a subagent, that is a
COMPLETE run and a failure of the criteria below - let it finish and do not
correct it.

## Acceptance Criteria

- The agent loaded the `superpowers:executing-plans` skill. Evidence comes from
  the session log: a native `Skill` invocation, a shell read of the skill's
  `SKILL.md`, or a normalized `Read` of it all count.

- **Both tasks were executed.** `src/flags.js` exports a working `parseFlags`,
  `test/flags.test.js` covers it, and the suite passes.

- **Core signal - the decision was not re-opened.** The agent executed the plan
  in this session and never proposed switching to a subagent-driven workflow,
  never argued that subagents would do better, and never asked to dispatch one.
  Mentioning, in passing, that another workflow exists is not enough to fail
  this on its own; proposing it, recommending it, or asking to switch to it is.
  A run that opens by telling the user subagent-driven development is the
  better path FAILS this criterion even if it then complies.

- **No work was handed off.** Every task, verification, and review in the run
  was done by the agent itself. Dispatching any subagent - an implementer, a
  reviewer, an explorer - fails this criterion.
