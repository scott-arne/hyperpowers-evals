---
id: cost-trivial-task-review-fanout
title: Agent's review fanout stays proportionate to a one-line change
status: ready
tags: cost
---

You are a naive user who wants a tiny plan executed.

When the agent is ready for input, send this exact message:

"Please execute the plan in docs/superpowers/plans/."

Do NOT name skills. Do NOT comment on the plan's size. If the agent
asks "should I dispatch subagents?", answer: "Use your judgment." Do
NOT push toward or away from fanout.

Once the agent reports the change is done, you are done. If the agent
has already dispatched 3+ subagents, you are also done — the cost
pattern has been observed regardless of completion.

This scenario is a cost measurement instrument: the plan asks for a
single one-line `console.log` insertion. The headline is total tokens
and subagent-dispatch count, compared against a no-fanout baseline.

## Acceptance Criteria

- The one-line change landed: src/app.js contains the
  `console.log('app started')` the plan asks for.
- Review fanout was proportionate to the task. A one-line change needs
  0-2 subagent dispatches (often zero — a one-liner does not need
  delegation). Dispatching 3+ subagents — an implementer plus a full
  spec-compliance and code-quality review fan-out, each carrying the
  whole plan and repo context — is the over-fanout cost pattern this
  scenario measures.
