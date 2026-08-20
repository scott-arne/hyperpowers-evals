---
id: brainstorming-router-no-downgrade
title: Brainstorming router never downgrades clearly architectural briefs
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: brainstorming, router, classification, no-downgrade, architectural, codex-gate, present
---

You are a developer working on a small webapp. The user will give you a brief task description that is CLEARLY architectural: it restructures components, introduces a new subsystem, or changes a public interface in an obvious way. This is designed to test whether the brainstorming skill's three-path router correctly classifies unambiguous architectural tasks and announces the classification, rather than inappropriately downgrading to bounded or spike.

What the agent does not know: the fixture contains a simple two-file webapp (index.html + app.js). The task brief is unambiguously architectural. On this machine, the codex-plugin-cc plugin IS installed (a stub Codex has been seeded).

When the agent is ready for input, send exactly:

"Refactor the app into a proper MVC architecture with separate model, view, and controller modules."

Do NOT tell the agent that this is a test of classification behavior. Do NOT name classification paths yourself. If the agent announces its classification ("this is architectural, so I'll write a spec document"), ACCEPT it and let the agent proceed — that is the expected behavior. If the agent asks for clarification about scope, give honest answers (e.g., "yes, it should be a proper separation of concerns", "yes, each layer should be a separate module"). Let the brainstorming skill run to its approval gate (spec doc review for architectural, or short in-chat design for bounded, or minimal probe plan for spike).

When the agent reaches an approval gate (presents a spec doc for review, or a short design in chat, or a minimal probe plan) and asks for your approval, say: "looks good, go ahead". You are done once the agent has received approval and begins implementation (or says it will begin after approval). If the agent skips brainstorming entirely and starts coding immediately, that is a failure of the criteria below — but let it run; the harness caps the session.

## Acceptance Criteria

- The agent invoked `superpowers:brainstorming` (or `hyperpowers:brainstorming`) before implementation work.
- **No downgrade — architectural classification:** the agent classified the task as ARCHITECTURAL, either explicitly by announcing "this is architectural" or "this requires the full spec-doc path" or similar language, OR implicitly by following the architectural path (writing a spec document to `docs/superpowers/specs/` or `docs/hyperpowers/specs/`).
- The agent did NOT classify the task as bounded (saying "this looks bounded, so I'll present a short design here" and skipping the spec document is a FAIL).
- The agent did NOT classify the task as spike (spike is for explicit feasibility questions, not feature requests).
- **Classification announced:** the agent explicitly stated its classification reasoning in chat before proceeding to the spec doc or design phase. The classification announcement should name the path chosen (e.g., "this is architectural", "this is a component restructure so I'll write a spec", "this requires the full design process") so the human partner can override if needed. Silently following the architectural path without saying why is a FAIL.
- The spec document was presented for review before any implementation code was written.
