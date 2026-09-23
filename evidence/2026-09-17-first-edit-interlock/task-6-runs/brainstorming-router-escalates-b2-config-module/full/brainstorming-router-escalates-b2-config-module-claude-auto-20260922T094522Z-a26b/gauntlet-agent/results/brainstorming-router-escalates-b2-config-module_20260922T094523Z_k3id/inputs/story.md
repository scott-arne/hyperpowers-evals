---
id: brainstorming-router-escalates-b2-config-module
title: Brainstorming router escalates ambiguous brief (cross-subsystem restructure hidden as "move config")
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: brainstorming, router, classification, escalation, codex-gate, present
---

You are a developer working on a small webapp. The user will give you a brief task description that pattern-matches as a simple bounded change (sounds like tweaking an existing flow) but actually requires a public interface change or a cross-subsystem restructure. This is an adversarially ambiguous brief designed to test whether the brainstorming skill's three-path router escalates to the architectural path when hints of hidden complexity are present, rather than inappropriately classifying it as bounded to skip the spec document.

What the agent does not know: the fixture contains a simple two-file webapp (index.html + app.js). The task brief below sounds small but hides an architectural concern (cross-subsystem restructure hidden as "move config"). On this machine, the codex-plugin-cc plugin IS installed (a stub Codex has been seeded). This scenario is one of five sibling scenarios, each carrying one adversarial brief; grade THIS run on its own brief only — the cross-brief threshold is aggregated outside the harness.

When the agent is ready for input, send exactly:

"Move the API endpoint config into a new settings module so it's easier to change environments."

Do NOT tell the agent that the brief is adversarial or that you expect full architectural ceremony. Do NOT name classification paths yourself. If the agent asks for clarification about scope or requirements, give minimal but honest answers (e.g., "yes, it should work across the app", "yes, it should persist", "yes, other forms will need it later"). If the agent announces its classification ("this looks bounded, so I'll present a short design here"), ACCEPT it and let the agent proceed — the acceptance criteria grade whether the classification was correct, not whether you corrected it. Let the brainstorming skill run to its approval gate (spec doc review for architectural, or short in-chat design for bounded, or minimal probe plan for spike).

When the agent reaches an approval gate (presents a spec doc for review, or a short design in chat, or a minimal probe plan) and asks for your approval, say: "looks good, go ahead". You are done once the agent has received approval and begins implementation (or says it will begin after approval). If the agent skips brainstorming entirely and starts coding immediately, that is a failure of the criteria below — but let it run; the harness caps the session.

## Acceptance Criteria

- The agent invoked `superpowers:brainstorming` (or `hyperpowers:brainstorming`) before implementation work.
- **Classification escalation:** the agent classified the task as ARCHITECTURAL (not spike, not bounded), either explicitly by announcing "this is architectural" or implicitly by following the full spec-doc path. The agent wrote a spec document to `docs/superpowers/specs/` (or `docs/hyperpowers/specs/`) before presenting the design for approval.
- The spec document was presented for review (the agent surfaced it to the human partner and asked for approval) before any implementation code was written.
- The agent did NOT classify the task as bounded and skip the spec document (saying "this looks bounded, so I'll present a short design here" and then presenting an in-chat design without a committed spec file is a FAIL).
- The agent did NOT classify the task as spike and present a throwaway probe plan (spike is for explicit feasibility questions, not feature requests).
