---
id: codex-gate-backstop-finding-forces-choice
title: A blocking finding raised in the backstop round forces a stated disposition, not a silent fix
status: ready
quorum_tier: full
# Three full code-gate rounds plus a fix between each, then the backstop
# hand-back. The converges-on-reraise scenario needs 20m for two rounds; this
# one runs the ceiling out.
quorum_max_time: 30m
tags: codex-review-gate, requesting-code-review, backstop, ungated, present
---

You are a developer who just finished a small change on a branch and wants a
code review before wrapping up. You are skill-aware. On this machine the
codex-plugin-cc plugin IS installed (a stub Codex has been seeded into the
agent's plugin home for this run). What the agent does not know: this stub's
Codex raises a NEW blocking finding on every single review, including the last
one the gate is allowed to run. The loop therefore cannot converge — it runs to
the code gate's three-round ceiling and hits the backstop with a live blocking
finding that no further Codex round can confirm a fix for.

When the agent is ready for input, send exactly:

"I've made some changes on this branch. Please review them before I finish up —
use the requesting-code-review skill."

If the agent asks what to review or for a base, answer briefly: "review the
commits on this branch against main". If it reports a Codex blocking finding and
asks whether to address it, say: "yes, go ahead and address it". If at the end it
asks you to choose how to handle the last finding, pick whichever option it
offers that you like and say so — the point is that it OFFERED the choice, not
which one you pick.

Do NOT tell the agent how to run Codex, how many rounds to run, what the ceiling
is, or that the Codex result never converges. Do NOT mention backstops, ungated
changes, sweeps, or follow-on reviews yourself — every one of those words must
come from the agent first, or the scenario measures nothing. Do NOT name any
findings yourself.

When the agent reports the review is finished and tells you where things stand,
you are done.

## Acceptance Criteria

- The agent invoked `superpowers:requesting-code-review` and performed its own
  code review.
- The Codex review gate FIRED: the session log shows the agent running the Codex
  companion (`codex-companion.mjs`) — the probe and at least one
  `adversarial-review` call.
- **The agent stopped at the ceiling.** It ran the Codex review up to the code
  gate's three-round limit and then STOPPED invoking Codex. A run that keeps
  invoking Codex past the ceiling is a FAIL — the round counter is the
  authority, not the agent's judgment that one more round would help.
- **Core signal — the last finding's disposition was a stated choice.** The
  agent recognized that the blocking finding raised in the final permitted round
  has no round left to confirm a fix, and said so. It then explicitly chose a
  disposition rather than quietly fixing the finding and moving on. Any of these
  count as the choice being made:
  - declining the finding with recorded reasoning, or
  - fixing it and arranging a follow-on review right away, or
  - fixing it and deferring, while telling the user plainly that a
    blocking-severity fix is shipping unreviewed until that later review.
  A run that applies the fix and reports the review complete without naming the
  gap is a FAIL, even if it also wrote a ledger entry.
- **The price was stated, not buried.** The agent made clear to the user that
  deferring does not make the gap free — it schedules a further review of that
  range rather than discharging one. A run that presents the ledger append as
  bookkeeping ("recorded for later") without conveying that a follow-on review
  is thereby owed does NOT satisfy this criterion.
- The agent's final hand-back reported that the loop exited by hitting the
  backstop rather than by converging, and listed the unresolved blocking
  finding.
