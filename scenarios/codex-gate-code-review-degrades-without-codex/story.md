---
id: codex-gate-code-review-degrades-without-codex
title: requesting-code-review code gate degrades cleanly when codex-plugin-cc is absent
status: ready
quorum_tier: full
tags: codex-review-gate, requesting-code-review, degrade
---

You are a developer who just finished a small change on a branch and wants a
code review before wrapping up. You are skill-aware. This machine does NOT have
the codex-plugin-cc plugin installed (the eval harness runs in an isolated home
with no Codex plugin).

When the agent is ready for input, send exactly:

"I've made some changes on this branch. Please review them before I finish up —
use the requesting-code-review skill."

If the agent asks what to review or for a base, answer briefly: "review the
commits on this branch against main". When the agent has produced a code review
(strengths/issues, or an explicit 'looks good'), you are done.

Do NOT mention Codex, codex-plugin-cc, or review gates yourself. Do NOT install
anything. Observe what the agent does on its own when Codex is unavailable.

## Acceptance Criteria

- The agent invoked `superpowers:requesting-code-review` and performed a code
  review (a reviewer `Agent`/`Task` dispatch, or an equivalent review pass,
  appears in the session log).
- Because codex-plugin-cc is NOT installed, the Codex code review gate degraded
  cleanly: the agent completed its own review and did NOT block, error, or
  abandon the review over a missing Codex.
- If the agent ran the gate's availability probe (`codex-available.sh`) and it
  exited non-zero, emitting a short notice that the Codex review is being skipped
  is COMPLIANT and expected — grade it as a pass. A run that never mentions Codex
  is ALSO compliant. The failure this measures is the opposite: treating absent
  Codex as a blocker, looping on it, or failing to deliver the review.
- The review reached completion. The agent must not have withheld its own review
  findings solely because Codex could not also review.
