---
id: codex-gate-re-review-focus-is-fixed
title: The round-2 re-review hands the ledger over as a path instead of restating it
status: ready
quorum_tier: full
# Reading the whole code-gate route, resuming the round counter, and running one
# detached re-review does not reliably fit the 10m default on slower backends.
quorum_max_time: 20m
tags: codex-review-gate, requesting-code-review, re-review, present
---

You are a developer part-way through a per-task Codex code gate. Round 1 already
ran: it raised blocking findings, you fixed them, and the fix is committed on the
branch. What is left is the next Codex round — the re-review that confirms the
fixes. You are skill-aware. On this machine the codex-plugin-cc plugin IS
installed (a stub Codex has been seeded into the agent's plugin home for this
run); its review approves.

When the agent is ready for input, send exactly:

"Round 1 of the per-task Codex code gate for task 1 is done — it raised blocking
findings, I fixed them, and the fix is committed on this branch. That gate is
still open: its directory is `~/.cache/hyperpowers/codex-review/active-gate` and
its round ledger is
`~/.cache/hyperpowers/codex-review/active-gate/codex-round-ledger.md`. The task
materials are `.cache/hyperpowers/sdd-scratch/task-1/task-brief.md`,
`.cache/hyperpowers/sdd-scratch/task-1/implementer-report.md`,
`.cache/hyperpowers/sdd-scratch/task-1/review-package.md`, and
`.cache/hyperpowers/sdd-scratch/global-constraints.md`. The review base is
`main`. Use the requesting-code-review skill and run the next Codex round for
this gate."

If the agent asks which gate type this is, answer: "the per-task code gate". If
it asks whether to start a new gate directory, answer: "no, continue the one
that is already open". If it asks anything else, answer briefly and stay in
role.

Do NOT tell the agent what to put in the Codex prompt, how the prompt should be
structured, how long it should be, what to include from the ledger, or how to
run Codex. Do NOT restate or summarize any finding yourself — the ledger is the
agent's to read.

When the agent reports the Codex round came back clean and the gate is done, you
are done.

## Acceptance Criteria

- The agent invoked `hyperpowers:requesting-code-review` and ran the Codex
  review gate rather than hand-rolling a review.
- The agent continued the OPEN gate: it reused the existing gate directory and
  its round counter instead of starting a fresh gate at round 1.
- The Codex round was actually launched: the session log shows the agent running
  the Codex companion (`codex-companion.mjs`) with `adversarial-review`.
- **Core signal — the findings were handed over as a file path, not pasted.**
  The prompt the agent sent to Codex points at the round ledger by path. It does
  not carry the ledger's content: no finding titles restated, no per-finding fix
  summaries, no quoted diff. A run whose Codex prompt reproduces what the ledger
  already says is a FAIL, even if the review comes back clean.
- The agent reported the outcome of the round and stopped, rather than looping
  Codex again after a clean result.
