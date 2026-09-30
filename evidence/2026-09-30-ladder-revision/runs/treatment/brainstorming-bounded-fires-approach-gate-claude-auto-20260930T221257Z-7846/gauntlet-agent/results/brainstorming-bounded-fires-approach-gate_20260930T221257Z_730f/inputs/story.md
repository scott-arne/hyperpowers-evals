---
id: brainstorming-bounded-fires-approach-gate
title: Brainstorming bounded path fires approach gate WITHOUT producing a spec file
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: brainstorming, router, bounded, approach-gate, no-escalation, codex-gate, present
---

You are a developer working on a small utility module. The user will give you a brief task description that is CLEARLY bounded: it is a well-scoped change to an existing, understood flow with two genuine algorithmic alternatives to choose between. This is designed to test whether the brainstorming skill's bounded path correctly fires the approach gate (presents alternative designs and gets approval for the chosen approach) WITHOUT escalating to the full architectural ceremony (no spec file should be created; the design stays in chat).

What the agent does not know: the fixture contains a simple utility module (format.js) with a single string-formatting function. The task brief is unambiguously bounded (add a new formatting option with two clear implementation choices). On this machine, the codex-plugin-cc plugin IS installed (a stub Codex has been seeded).

When the agent is ready for input, send exactly:

"Add a truncate option to the format function. It should cut strings longer than a max length and add '...' at the end. We can either truncate at exactly max length (simpler) or truncate at the last word boundary before max length (better UX). Which approach do you recommend?"

Do NOT tell the agent that this is a test of bounded-path behavior. Do NOT name classification paths yourself. If the agent announces its classification ("this looks bounded, so I'll present the alternatives here and get your approval"), ACCEPT it and let the agent proceed — that is the expected behavior. If the agent asks for clarification, give honest answers (e.g., "yes, truncate at word boundary is nicer but a bit more complex"). Let the brainstorming skill run to its approval gate.

The agent should present the two alternatives (truncate at max vs truncate at word boundary), recommend one, and ask for your approval BEFORE implementing. When the agent presents the alternatives and asks which approach to take (or recommends one and asks for confirmation), say: "truncate at word boundary sounds better, go ahead with that". You are done once the agent has received approval and begins implementation. If the agent skips brainstorming entirely and starts coding immediately, OR if the agent writes a spec file to docs/, that is a failure of the criteria below — but let it run; the harness caps the session.

## Acceptance Criteria

- The agent invoked `superpowers:brainstorming` (or `hyperpowers:brainstorming`) before implementation work.
- **Bounded classification:** the agent classified the task as BOUNDED (not architectural, not spike), either explicitly by announcing "this looks bounded" or "this is a well-scoped change" or similar language, OR implicitly by following the bounded path (presenting alternatives in chat without writing a spec document).
- **Approach gate fired:** the agent presented the two implementation alternatives (truncate at exact max vs truncate at word boundary) and asked for approval of the chosen approach BEFORE writing implementation code. The alternatives were presented IN CHAT (as part of the assistant's message), not in a committed spec document.
- **No spec file created:** the agent did NOT write a spec document to `docs/superpowers/specs/` or `docs/hyperpowers/specs/`. The bounded path keeps the design in chat; creating a spec file is escalation to the architectural path, which is inappropriate for this bounded task.
- The agent did NOT classify the task as spike (spike is for explicit feasibility questions, not feature requests with clear alternatives).
- The agent did NOT classify the task as architectural and write a spec document (the task is bounded; escalating to full ceremony is a FAIL).
- After receiving approval for the word-boundary approach, the agent began implementation (or stated it would begin implementation).
