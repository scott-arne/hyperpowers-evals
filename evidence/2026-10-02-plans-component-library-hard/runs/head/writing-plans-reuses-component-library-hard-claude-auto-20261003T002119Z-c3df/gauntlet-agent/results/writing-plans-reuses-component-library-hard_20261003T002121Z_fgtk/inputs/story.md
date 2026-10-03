---
id: writing-plans-reuses-component-library-hard
title: Writing-plans builds a new page from a vendored component library that no page uses, when the spec points at a hand-written page
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: writing-plans, ui, component-library, grounding
---

You are a developer on a small internal web dashboard. You have already written a design spec for a new page and you want an implementation plan for it. This is designed to test whether the plan the agent writes builds the page's controls from the repository's own component library, or copies hand-written markup from the existing page the spec points at.

What the agent does not know: the fixture is Harbor, a server-rendered Node dashboard with no dependencies. It was started from the Keel admin template, whose component kit is vendored as one directory per component under `vendor/kit/<name>/src/`. Pages reach it through package.json subpath imports such as `#kit/button`. The kit has twelve components, among them a sortable data table (`dataTable`), a labeled select (`selectField`), a filter form (`filterBar`), a badge, an empty state, a card and a page header. Five pages exist (Overview, Services, Incidents, On-call, Runbooks), and every one of them imports only the kit's button and dialog: each writes its own tables, selects, pills, panels and empty messages, with the dashboard's own escaping helper. The README does not mention the kit. The spec, at `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`, describes a new Deploys page with an environment dropdown, a sortable table, colored status chips and an empty state, and says its sorting and filter behave as on the Services page (`src/pages/services.js`), which hand-writes its table and select. The spec says nothing about how to build the controls. Every control it asks for exists in the kit.

When the agent is ready for input, send exactly:

"I've written up the spec for the new Deploys page in docs/hyperpowers/specs/2026-10-01-deploys-page-design.md. Can you write the implementation plan for it? Don't start implementing yet, I want to read the plan first."

Do NOT tell the agent that this is a test. Do NOT mention `vendor/kit`, `#kit`, the component library, the template, reuse, or the Services page yourself, and do NOT say how the page should be built. Withholding every cue in both directions is the whole experiment.

If the agent asks clarifying questions, give honest answers that stay neutral about how the page is built: "the spec is final"; "no pagination, the snapshot only keeps the last 50 deploys"; "people read it, nothing scrapes it". If the agent asks whether to use the components in `vendor/kit/`, or whether to copy the Services page, answer "your call, do what you'd normally do". If it offers to brainstorm or to change the spec, say "no, the spec is final, just the plan please". If it offers to start implementing, or asks how to execute the plan, say "not yet, I'll read the plan first".

You are done when a plan document exists under `docs/hyperpowers/plans/` (or `docs/superpowers/plans/`) and the agent has said it is written, or the agent refuses.

## Acceptance Criteria

- The agent invoked `superpowers:writing-plans` (or `hyperpowers:writing-plans`).
- A plan document exists under `docs/hyperpowers/plans/` or `docs/superpowers/plans/`.
- **Kit table and select:** the plan builds the Deploys table and the environment filter from the repository's component kit in `vendor/kit/`: the code it gives for the page calls `dataTable` and `selectField`. A plan whose page code writes its own `<table>` or `<select>` markup fails this criterion.
- The agent did not start implementing: no source, test, data, public or vendored file, and not package.json, was created or changed.
