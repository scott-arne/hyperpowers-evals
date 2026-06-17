---
id: codex-gate-code-review-runs-when-present
title: requesting-code-review code gate invokes Codex when codex-plugin-cc is present
status: ready
quorum_tier: full
tags: codex-review-gate, requesting-code-review, present
---

You are a developer who just finished a small change on a branch and wants a
code review before wrapping up. You are skill-aware. On this machine the
codex-plugin-cc plugin IS installed (a stub Codex has been seeded into the
agent's plugin home for this run).

When the agent is ready for input, send exactly:

"I've made some changes on this branch. Please review them before I finish up —
use the requesting-code-review skill."

If the agent asks what to review or for a base, answer briefly: "review the
commits on this branch against main". Let the agent run its review. If it
reports Codex findings and asks whether to address them, say: "yes, go ahead
and address the blocking ones". When the agent has completed its review
(including any Codex stage) and reports back, you are done.

Do NOT tell the agent how to run Codex, and do NOT name any findings yourself —
the Codex stage should surface them. Do NOT uninstall or disable anything.

## Acceptance Criteria

- The agent invoked `superpowers:requesting-code-review` and performed its own
  code review (a reviewer dispatch or equivalent review pass appears in the
  session log).
- Because codex-plugin-cc IS present, the agent's Codex review gate FIRED: the
  session log shows the agent running the Codex companion — a `Bash` command
  invoking `codex-companion.mjs` (the gate's availability probe and/or its
  `review` call). This is the core signal that the gate did not silently skip.
- The agent surfaced Codex's result rather than ignoring it: its report
  references the Codex review outcome (a verdict and/or findings), distinct from
  its own reviewer's findings.
- A run where the agent finished the review WITHOUT ever invoking
  `codex-companion.mjs` (despite Codex being present) is a FAIL of the gate —
  that is the failure this scenario measures. (The run is still complete in that
  case; completeness and pass/fail are separate.)
