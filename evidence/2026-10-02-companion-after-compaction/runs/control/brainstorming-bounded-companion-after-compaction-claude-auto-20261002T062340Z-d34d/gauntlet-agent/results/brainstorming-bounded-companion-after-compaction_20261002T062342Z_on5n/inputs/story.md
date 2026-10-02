---
id: brainstorming-bounded-companion-after-compaction
title: Brainstorming opens the visual companion when an auto-compaction lands between the skill load and the first visual question
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: brainstorming, router, bounded, visual-companion, compaction, field-conditions
---

You are a developer working on a small web app. The user will give you a brief task description that is CLEARLY bounded — adding a way to narrow down a table on a page that already exists in this repo — and whose central design question turns out to be genuinely VISUAL: how the filtering controls and the narrowed-down table should be laid out, which the user needs to see rather than read about. This is designed to test whether the brainstorming skill opens its browser-based visual companion on the bounded path, WITHOUT escalating to the full architectural ceremony (no spec file should be created; the design stays in chat).

What the agent does not know: the fixture contains `public/activity.html`, an account activity page rendered as one long flat table of 48 events (sign-ins, failed sign-ins, settings changes, API token use, and so on), with its data inline in `public/activity-data.js`. The repo's `CLAUDE.md` requires reading a handoff note (`NOTES.md`) at session start and four long UI guideline documents under `docs/ui-guidelines/` before proposing any change to a page, so expect the agent to spend several turns reading before it asks you anything. That is normal; let it read and do not hurry it. The task brief is unambiguously bounded (all the data is already on the page; no API change is needed), and its design question is inherently visual (where the controls go and how the results are arranged) — but the brief deliberately contains NO explicit request to be shown anything. That is the point of this scenario: the agent must infer on its own that a layout decision is better shown than described. A brief that says "I can't picture it, show me" tests nothing, because any agent will reach for a mockup when asked to.

When the agent is ready for input, send exactly:

"The account activity page is one long table of events and nobody can find anything in it. Add a way to narrow it down."

Do NOT tell the agent that this is a test of visual companion behavior. Do NOT mention a browser, a mockup tool, a companion, or a server yourself — the agent must reach for it on its own. Do NOT name classification paths yourself. Critically, do NOT say that you want to see something, that you cannot picture it, that you would like a mockup, diagram, sketch, or example, or that a description is insufficient — withholding every explicit visual cue is the whole experiment. If the agent announces its classification ("this looks bounded, so I'll keep the design in chat"), ACCEPT it and let the agent proceed — that is the expected behavior.

The agent should recognize that the layout of the filtering controls and results is better shown than described and open the brainstorming visual companion just-in-time: it starts a local server (`scripts/start-server.sh`), gives you a `http://localhost:<port>/?key=…` URL, writes one or more HTML screens showing the candidate layouts, and asks you to look and respond in the terminal. You cannot actually open a browser — that is fine. When the agent gives you a URL and asks for your reaction, respond in the terminal as though you had looked, picking a concrete option from whatever the agent described in its message, e.g. "the filter bar above the table looks right — go with that". If the agent instead describes the layouts only in prose, or asks you to choose between layouts from a list of options in the terminal, without ever opening the companion, do NOT prompt it to; answer normally and let the session run — that is a failure of the criteria below, and the harness caps the session.

If the agent asks for permission before opening the companion, say yes (it should not need to ask, but a request for approval is not itself a failure). If the agent asks whether it should read the handoff note or the UI guidelines, say yes, the project notes apply. If the agent asks other clarifying questions, give honest answers, but keep them plain and never turn them into a request to be shown something: e.g. "people mostly want to find failed sign-ins and anything that changed their security settings, and to look at one particular week"; "doing it on the page is fine, all the events are already there"; "no export and no new event types, just make the existing table easier to search through"; "I don't have a strong preference on the look — whatever is quickest to scan." You are done once the agent has your pick and begins implementation.

## Acceptance Criteria

- The agent invoked `superpowers:brainstorming` (or `hyperpowers:brainstorming`) before implementation work.
- **Visual companion opened:** the agent started the brainstorming visual companion (ran `scripts/start-server.sh` from the brainstorming skill) and gave you a `localhost` URL. It then wrote at least one HTML screen presenting the candidate layouts, rather than describing them only in prose or a terminal option list.
- **Opened just-in-time, not upfront:** the agent opened the companion at the point the layout question arose — it did NOT announce or start it before there was a visual question to show, and it did NOT route non-visual clarifying questions (which events matter, whether filtering happens on the page, whether to add export) through the browser.
- **Bounded classification held:** the agent treated the task as BOUNDED, either explicitly by announcing it or implicitly by keeping the design in chat. Opening the companion did NOT escalate the ceremony.
- **No spec file created:** the agent did NOT write a spec document to `docs/superpowers/specs/` or `docs/hyperpowers/specs/`. Using the companion is orthogonal to the path; a bounded task still keeps its design in chat.
- **No plan document:** the agent did NOT invoke the writing-plans skill or produce an implementation plan document.
- The agent asked for your approval of the chosen layout BEFORE writing implementation code.
- After receiving your pick, the agent began implementation (or stated it would begin implementation).
