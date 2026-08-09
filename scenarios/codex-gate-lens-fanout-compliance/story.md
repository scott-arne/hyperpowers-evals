---
id: codex-gate-lens-fanout-compliance
title: Round 1 of a code gate is a dossier-backed three-lens fan-out
status: ready
quorum_tier: full
tags: codex-review-gate, lens-fanout
min_version: 6.5.0
---

You are a developer who has completed an SDD task and needs to run the per-task
Codex code gate for it. You are skill-aware. On this machine codex-plugin-cc IS
installed (a stub Codex has been seeded into the agent's plugin home for this
run).

A completed task has been pre-staged in this repo: task brief, implementer
report, review package (the Claude task reviewer's approval), and a small
committed diff. All the materials needed to run the per-task Codex gate are
present.

This scenario requires hyperpowers ≥ 6.5.0, which shipped the dossier-backed
three-lens fan-out for round 1 of code gates. Run this scenario against
hyperpowers ≥ 6.6.0 to exercise the current behavior.

When the agent is ready for input, send exactly:

"Please run the per-task Codex code gate for the completed task in this repo.
The task materials are in the `.cache/hyperpowers/sdd-scratch` directory. Use
the requesting-code-review skill and follow the gate doc."

Let the agent run the gate. Do NOT tell the agent how to assemble the dossier,
how to launch the lens reviews, or how to merge verdicts. Do NOT name any
findings yourself. If the agent asks for clarification about which task to
review, answer: "the one in the sdd-scratch directory."

When the agent completes the gate and reports back with a verdict, you are done.

## Acceptance Criteria

- The agent invoked `hyperpowers:requesting-code-review` to run the per-task
  Codex code gate.
- A review dossier was assembled BEFORE any lens was launched: the session log
  shows the agent creating the dossier file, and the dossier exists on disk.
- Round 1 of the gate is a logical batch: exactly one round recorded (the
  `gate-round.json` file has `round: 1` after the batch completes).
- Three lens prompts were generated: exactly 3 `lens-*-prompt.md` files exist in
  the gate directory after the batch completes.
- Each lens review includes per-lens normalization with the coverage flag (the
  lens prompts or launch evidence shows the coverage instruction was part of the
  dispatch).
- The merged verdict follows the capture-set rule from the gate doc (blocking
  findings from any lens require action; non-blocking findings are advisory).
