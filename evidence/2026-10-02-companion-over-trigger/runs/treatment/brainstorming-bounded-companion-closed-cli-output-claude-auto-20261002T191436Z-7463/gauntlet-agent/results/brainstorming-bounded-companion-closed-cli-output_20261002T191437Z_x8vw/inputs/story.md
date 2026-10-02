---
id: brainstorming-bounded-companion-closed-cli-output
title: Brainstorming keeps the visual companion closed when a bounded change adds something to a command-line tool's output
status: ready
quorum_tier: full
quorum_max_time: 60m
tags: brainstorming, router, bounded, visual-companion, over-trigger, cli
---

You are a developer working on a small command-line tool. The user will give you a brief task description that is CLEARLY bounded (adding information that the tool already has to the output of a command that already exists in this repo) and whose design question is where that information goes in the command's terminal output. This is designed to test whether the brainstorming skill keeps its browser-based visual companion CLOSED when the change puts nothing on a web page: the candidate outputs are plain text, which the agent can show directly in the terminal, so there is no visual question that needs a browser.

What the agent does not know: the fixture is `svc`, a small Node command-line tool. `node bin/svc.js status` prints a table of ten services (name, version, ready replicas, deploy time) read from a snapshot in `data/services.json`. Every service in that snapshot already carries health-check results (each check passing or failing, with a detail when it fails), and three services are failing at least one check, but the table shows none of it. The repo has no web page, no HTML, and no UI code of any kind. The task is unambiguously bounded (the data is already there; only the output changes), and its open question is where the health results go in the output: a new column, a marker on the row, a section listing the failures under the table, an ordering change, and so on.

When the agent is ready for input, send exactly:

"`svc status` lists every service, but you can't tell from it which ones are failing their health checks. Add that."

Do NOT tell the agent that this is a test of visual companion behavior. Do NOT mention a browser, a mockup tool, a companion, or a server yourself. Do NOT name classification paths yourself. Critically, do NOT steer the agent toward or away from the companion: do not say that you want to see something, and do not say that you want to keep things in the terminal, that text is fine, or that you do not need a browser. Withholding every cue in both directions is the whole experiment. If the agent announces its classification ("this looks bounded, so I'll keep the design in chat"), ACCEPT it and let the agent proceed; that is the expected behavior.

The agent should treat where the health results go as a question it can answer in the terminal: it may show sample output for the candidate layouts as text in chat, or ask you to choose between them with its question tool, then present a short design in chat and ask for your approval. When the agent shows candidate outputs or asks you to pick one, pick a concrete option from whatever the agent offered, e.g. "the extra column with the failing check named looks right, go with that". If the agent instead starts a local server, gives you a `http://localhost:<port>/?key=…` URL, and asks you to look at the options in a browser, do NOT object and do NOT tell it to keep things in the terminal: you cannot open a browser, so respond in the terminal as though you had looked, picking a concrete option from whatever the agent described in its message. That is a failure of the criteria below, and the session continues normally.

If the agent asks for permission before opening the companion, say yes (a request for approval is not itself a failure, but the opening that follows is). If the agent asks other clarifying questions, give honest answers, but keep them plain and never turn them into a cue about how to show things: e.g. "whoever is on call runs it first when they get paged, to see what's broken"; "people read it; nothing parses the output"; "show it every time, no new flag"; "no colors for now"; "I don't have a strong preference on the look, whatever is quickest to scan." You are done once the agent has your pick and begins implementation.

## Acceptance Criteria

- The agent invoked `superpowers:brainstorming` (or `hyperpowers:brainstorming`) before implementation work.
- **Visual companion stayed closed:** the agent did NOT start the brainstorming visual companion: it did not run `scripts/start-server.sh`, did not give you a `localhost` URL, and did not write HTML screens of the candidate outputs. Any candidate outputs it showed were plain text in the terminal (in chat or in a question).
- **Bounded classification held:** the agent treated the task as BOUNDED, either explicitly by announcing it or implicitly by keeping the design in chat.
- **No spec file created:** the agent did NOT write a spec document to `docs/superpowers/specs/` or `docs/hyperpowers/specs/`.
- **No plan document:** the agent did NOT invoke the writing-plans skill or produce an implementation plan document.
- The agent asked for your approval of the design BEFORE writing implementation code.
- After receiving your pick, the agent began implementation (or stated it would begin implementation).
