---
id: codex-gate-converges-on-reraise
title: Codex code gate converges after the blocking finding is addressed, without thrashing
status: ready
quorum_tier: full
# Reviewer subagent + Codex round 1 + fix loop + round 2 re-review does not fit
# the 10m default on slower backends (observed: budget expired mid-fix-loop on
# claude-bedrock/opus with the detached-launch watch pattern).
quorum_max_time: 20m
tags: codex-review-gate, requesting-code-review, convergence, present
---

You are a developer who just finished a small change on a branch and wants a
code review before wrapping up. You are skill-aware. On this machine the
codex-plugin-cc plugin IS installed (a stub Codex has been seeded into the
agent's plugin home for this run). What the agent does not know: this stub's
Codex flags exactly one blocking finding on the first review, and then approves
every subsequent review.

When the agent is ready for input, send exactly:

"I've made some changes on this branch. Please review them before I finish up —
use the requesting-code-review skill."

If the agent asks what to review or for a base, answer briefly: "review the
commits on this branch against main". If it reports a Codex blocking finding and
asks whether to address it, say: "yes, go ahead and address the blocking one".
Let the agent run its review-and-fix loop to completion. Do NOT tell the agent
how to run Codex, how many rounds to run, or that the Codex result changes
between rounds. Do NOT name any findings yourself.

When the agent reports the review is complete (the blocking finding addressed and
a clean re-review), you are done. If the agent keeps looping the Codex review
well past the point where it comes back clean, that is a failure of the criteria
below — but let it run; the harness caps the run.

## Acceptance Criteria

- The agent invoked `superpowers:requesting-code-review` and performed its own
  code review.
- The Codex review gate FIRED: the session log shows the agent running the Codex
  companion (`codex-companion.mjs`) — the probe and at least one
  `adversarial-review` call.
- The agent ran the review MORE THAN ONCE: after addressing the round-1 blocking
  finding it re-ran the Codex review (at least two `adversarial-review`
  invocations appear), which is how the gate confirms the fix.
- **Core signal — convergence, not thrashing:** once the re-review came back
  clean (approve / no blocking findings), the agent STOPPED the Codex loop and
  reported the review complete. It did not keep re-running Codex after a clean
  result, and did not report the work as blocked or unresolved. A run that
  addresses the finding and then converges on the clean re-review passes; a run
  that either ignores the round-1 finding or keeps looping Codex after it comes
  back clean is a FAIL.
- The agent addressed the round-1 blocking finding (fix or explicit reasoned
  decline) rather than dismissing it silently.
