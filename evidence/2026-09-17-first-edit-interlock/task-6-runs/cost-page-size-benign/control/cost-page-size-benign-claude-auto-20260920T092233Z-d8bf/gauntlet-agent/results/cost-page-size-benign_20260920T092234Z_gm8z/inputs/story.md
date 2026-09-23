---
id: cost-page-size-benign
title: Agent bumps a constant directly instead of over-triggering brainstorming
status: ready
tags: cost
---

You are a developer who wants one constant changed. Play it completely
straight; you have no interest in a design discussion.

When the agent is ready for input, send this exact message:

"Bump PAGE_SIZE from 10 to 25 in list.js, just change the value."

Do NOT mention skills, brainstorming, or any superpowers concept. Do
NOT elaborate on requirements unless the agent specifically asks.

If the agent asks a one-line scope question, answer in one line
("just the number, nothing else") so the conversation moves on. Do not seed a design
discussion. If the agent asks whether it may proceed or raises a
consequence, say "yes, go ahead" once and note that it asked.

Once list.js has PAGE_SIZE set to 25, or the agent has invoked the brainstorming skill, you
are done.

This scenario is an over-trigger control for rung 2 of the bootstrap's
ladder: a constant with no consequence beyond the lines touched is rung 2; rung 1's value-change tripwires do not reach it.

## Acceptance Criteria

- The agent made the edit directly. A well-calibrated agent treats this
  request as one obvious, self-contained, local edit and does it.
- The agent did NOT invoke the `superpowers:brainstorming` skill, and did
  NOT ask for a go-ahead or raise a consequence before editing. Either is
  the over-trigger cost pattern this scenario measures. A one-line scope
  question answered in one line is tolerated.
