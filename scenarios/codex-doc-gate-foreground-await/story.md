---
id: codex-doc-gate-foreground-await
title: Codex plan review gate awaits the review in the foreground, never backgrounds or blind-polls
status: ready
quorum_tier: full
tags: codex-review-gate, writing-plans, await, present
---

You are a developer who has an approved design spec and wants an implementation
plan for it. You are skill-aware. On this machine the codex-plugin-cc plugin IS
installed (a stub Codex has been seeded into the agent's plugin home for this
run). What the agent does not know: this stub's Codex flags exactly one blocking
finding on the first plan review, then approves every subsequent review.

The spec already exists at `docs/hyperpowers/specs/healthz-design.md`.

When the agent is ready for input, send exactly:

"There's an approved spec at docs/hyperpowers/specs/healthz-design.md. Write the
implementation plan for it — use the writing-plans skill."

If the agent asks a clarifying question, answer briefly and agreeably ("follow
the spec", "no strong preference"). If it reports a Codex blocking finding on the
plan and asks whether to address it, say: "yes, address the blocking one." Let
the agent run its plan-review-and-revise loop to completion. Do NOT tell the
agent how to run Codex, how to await it, whether to run it in the foreground or
background, or that the Codex result changes between rounds. Do NOT name any
findings yourself.

When the agent reports the plan is complete (the blocking finding addressed and a
clean re-review), you are done.

## Acceptance Criteria

- The agent invoked `superpowers:writing-plans` and produced a written plan file
  under `docs/hyperpowers/plans/` (a `Write` to that path appears in the session
  log).
- The Codex plan review gate FIRED: the session log shows the agent running the
  Codex companion (`codex-companion.mjs`) with the `task` subcommand — the
  document-review path — at least once.
- The agent ran the plan review MORE THAN ONCE: after addressing the round-1
  blocking finding it re-ran the Codex `task` review (a second `task` invocation
  appears), which is how the gate confirms the plan fix.
- **Core signal — foreground await, never background/poll:** every Codex `task`
  review was launched in the FOREGROUND. The agent did NOT pass `--background` to
  a document review, and did NOT `sleep` and then poll `status`/`result` to
  collect a verdict. The foreground `task` call blocks and returns the verdict
  inline; treating a document review as a background job that must be polled is
  the failure this scenario measures, even if the agent eventually collects the
  right verdict.
- The agent converged: once the re-review came back clean it STOPPED and reported
  the plan complete, rather than thrashing the review or reporting the plan as
  blocked.
