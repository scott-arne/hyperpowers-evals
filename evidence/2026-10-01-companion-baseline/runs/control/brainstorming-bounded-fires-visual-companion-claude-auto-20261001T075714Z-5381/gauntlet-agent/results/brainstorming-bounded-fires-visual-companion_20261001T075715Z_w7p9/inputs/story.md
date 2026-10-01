---
id: brainstorming-bounded-fires-visual-companion
title: Brainstorming bounded path opens the visual companion for a genuinely visual question
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: brainstorming, router, bounded, visual-companion, no-escalation, present
---

You are a developer working on a small web app. The user will give you a brief task description that is CLEARLY bounded — relaying out a settings page that already exists in this repo — but whose open question is genuinely VISUAL: the answer is a layout the user needs to see, not a paragraph they can read. This is designed to test whether the brainstorming skill opens its browser-based visual companion on the bounded path, WITHOUT escalating to the full architectural ceremony (no spec file should be created; the design stays in chat).

What the agent does not know: the fixture contains `public/settings.html`, a settings page rendered as one long flat list of twelve fields, plus its CSS and a small JS handler. The task brief is unambiguously bounded (relayout an existing page), and the design question is inherently visual (which of several plausible groupings and structures to adopt) — but the brief deliberately contains NO explicit request to be shown anything. That is the point of this scenario: the agent must infer on its own that a layout decision is better shown than described. A brief that says "I can't picture it, show me" tests nothing, because any agent will reach for a mockup when asked to.

When the agent is ready for input, send exactly:

"Our settings page is one long flat list of fields and it's getting hard to scan. Rework the layout so related settings are grouped."

Do NOT tell the agent that this is a test of visual companion behavior. Do NOT mention a browser, a mockup tool, a companion, or a server yourself — the agent must reach for it on its own. Do NOT name classification paths yourself. Critically, do NOT say that you want to see something, that you cannot picture it, that you would like a mockup, diagram, sketch, or example, or that a description is insufficient — withholding every explicit visual cue is the whole experiment. If the agent announces its classification ("this looks bounded, so I'll keep the design in chat"), ACCEPT it and let the agent proceed — that is the expected behavior.

The agent should recognize that a layout question is better shown than described and open the brainstorming visual companion just-in-time: it starts a local server (`scripts/start-server.sh`), gives you a `http://localhost:<port>/?key=…` URL, writes one or more HTML screens showing the candidate layouts, and asks you to look and respond in the terminal. You cannot actually open a browser — that is fine. When the agent gives you a URL and asks for your reaction, respond in the terminal as though you had looked, picking a concrete option from whatever the agent described in its message, e.g. "the grouped cards with section headers look right — go with that". If the agent instead describes the layouts only in prose without ever opening the companion, do NOT prompt it to; answer normally and let the session run — that is a failure of the criteria below, and the harness caps the session.

If the agent asks for permission before opening the companion, say yes (it should not need to ask, but a request for approval is not itself a failure). If the agent asks other clarifying questions, give honest answers, but keep them plain and never turn them into a request to be shown something: e.g. "yes, the account fields and the notification fields feel like separate things"; "no, I don't want to add new settings, just reorganize the ones we have"; "I don't have a strong preference on the structure — whatever scans best." You are done once the agent has your pick and begins implementation.

## Acceptance Criteria

- The agent invoked `superpowers:brainstorming` (or `hyperpowers:brainstorming`) before implementation work.
- **Visual companion opened:** the agent started the brainstorming visual companion (ran `scripts/start-server.sh` from the brainstorming skill) and gave you a `localhost` URL. It then wrote at least one HTML screen presenting the candidate layouts, rather than describing them only in prose in the terminal.
- **Opened just-in-time, not upfront:** the agent opened the companion at the point the layout question arose — it did NOT announce or start it before there was a visual question to show, and it did NOT route non-visual clarifying questions (scope, which fields to group, whether to add new settings) through the browser.
- **Bounded classification held:** the agent treated the task as BOUNDED, either explicitly by announcing it or implicitly by keeping the design in chat. Opening the companion did NOT escalate the ceremony.
- **No spec file created:** the agent did NOT write a spec document to `docs/superpowers/specs/` or `docs/hyperpowers/specs/`. Using the companion is orthogonal to the path; a bounded task still keeps its design in chat.
- **No plan document:** the agent did NOT invoke the writing-plans skill or produce an implementation plan document.
- The agent asked for your approval of the chosen layout BEFORE writing implementation code.
- After receiving your pick, the agent began implementation (or stated it would begin implementation).
