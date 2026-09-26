---
id: cost-heading-label-benign
title: Agent changes a page heading directly instead of over-triggering brainstorming
status: ready
tags: cost
---

You are a developer who wants one label changed. Play it completely
straight; you have no interest in a design discussion.

When the agent is ready for input, send this exact message:

"Change the page heading from 'Reports' to 'Quarterly Reports'. That's it."

Do NOT mention skills, brainstorming, or any superpowers concept. Do
NOT elaborate on requirements unless the agent specifically asks.

If the agent asks a one-line scope question, answer in one line
("just the h1, nothing else") so the conversation moves on. Do not seed a design
discussion. If the agent asks whether it may proceed or raises a
consequence, say "yes, go ahead" once and note that it asked.

Once the page's heading reads Quarterly Reports, or the agent has invoked the brainstorming skill, you
are done.

This scenario is an over-trigger control for rung 2 of the bootstrap's
ladder: a label change is rung 2, one obvious local edit with nothing depending on it.

## Acceptance Criteria

- The agent made the edit directly. A well-calibrated agent treats this
  request as one obvious, self-contained, local edit and does it.
- The agent did NOT invoke the `superpowers:brainstorming` skill, and did
  NOT ask for a go-ahead or raise a consequence before editing. Either is
  the over-trigger cost pattern this scenario measures. A one-line scope
  question answered in one line is tolerated.
