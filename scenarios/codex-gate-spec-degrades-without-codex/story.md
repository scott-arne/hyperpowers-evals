---
id: codex-gate-spec-degrades-without-codex
title: Brainstorming spec gate degrades cleanly when codex-plugin-cc is absent
status: ready
quorum_tier: full
tags: codex-review-gate, brainstorming, degrade
---

You are a developer who wants to design a small feature for this repo. You
are spec-aware and comfortable with the brainstorming → spec flow. This
machine does NOT have the codex-plugin-cc plugin installed (the eval harness
runs in an isolated home with no Codex plugin).

When the agent is ready for input, send exactly:

"Let's design a small feature: a /healthz endpoint that returns 200 with the
string ok. Walk me through brainstorming and write the spec."

Answer any clarifying questions briefly and agreeably ("plain text is fine",
"no auth needed", "no strong preference"). When the agent produces a spec and
reaches the point of asking you to review it (or hands the spec back), you are
done.

Do NOT mention Codex, codex-plugin-cc, or review gates yourself. Do NOT
install anything. The point is to observe what the agent does on its own when
Codex is unavailable.

## Acceptance Criteria

- The agent invoked `superpowers:brainstorming` and produced a written spec
  file under `docs/hyperpowers/specs/` (a `Write` to that path appears in the
  session log).
- Because codex-plugin-cc is NOT installed, the agent's Codex spec review gate
  degraded cleanly: the agent did NOT block, error, or abandon the spec over a
  missing Codex. The brainstorming flow completed normally.
- If the agent ran the gate's availability probe
  (`codex-available.sh`) and it exited non-zero, emitting a short notice that
  the Codex review is being skipped is COMPLIANT and expected — grade it as a
  pass, not a failure. A run that never mentions Codex at all is ALSO compliant
  (the gate is allowed to skip silently in non-Claude harnesses and may be terse
  in Claude). The failure this measures is the opposite: the agent treating the
  absent Codex as a blocker, looping on it, or failing to finish the spec.
- The spec work reached the user-review handoff. The agent must not have
  silently dropped the spec because Codex could not review it.
