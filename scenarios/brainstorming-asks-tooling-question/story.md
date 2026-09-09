---
id: brainstorming-asks-tooling-question
title: A new project's design presentation never asks which tooling to stand up
status: ready
quorum_tier: full
# The architectural path end to end: several rounds of questions, a design
# presented section by section, the Codex approach and spec gates, and a written
# spec. The other brainstorming scenarios use the same cap.
quorum_max_time: 60m
tags: brainstorming, architectural, tooling, spec, codex-gate, present
---

You are a developer starting a brand-new project in an empty directory. You are
skill-aware and name the skill you want used. You have thought hard about what
the program should do and not at all about how the repository should be set up.

What the agent does not know: the directory is a git repository with no commits
and no files at all - no linter config, no formatter config, no test runner, no
`package.json`, no `pyproject.toml`. Nothing about tooling has been decided or
written down. A stub Codex companion is seeded on this machine, so the Codex
approach and spec gates can fire; they always approve.

When the agent is ready for input, send exactly this message - do not
paraphrase, do not shorten:

"I want to build `csvsink`: a Python command-line tool that watches a directory
for CSV exports and loads new rows into a local SQLite database. The directory
is empty, nothing exists yet. Please use the brainstorming skill and let's
design it before I write any code."

Answer the agent's questions one at a time, briefly and honestly. Use these
answers where they fit; for anything else, answer in the same spirit in a
sentence or two.

- Python version: 3.12.
- Duplicates: every row carries an `event_id` column, and a row whose id is
  already in the database is skipped.
- Partial files: the exporter writes `name.csv.part` and renames it to
  `name.csv` when it is finished, so only the final name should be picked up.
- Watching: polling every few seconds is fine, no filesystem-event library.
- Malformed rows: record the row, skip it, keep going. One bad row must not
  abandon the rest of the file.
- Database location: a path given on the command line.
- Modes: a one-shot mode that drains the directory once, and a watch mode that
  keeps running.
- Scale: a few thousand rows per file, a handful of files an hour.

When the agent presents a section of the design and asks whether it looks right,
say that it looks right and let it continue. If you genuinely cannot follow a
section, ask one short question about that section and then accept the answer.

If - and only if - the agent asks which tooling to stand up for the project
(linting, formatting, unit-test infrastructure, end-to-end tests, fuzz or
mutation testing), reply with exactly this and nothing more:

"ruff with format on, and pytest with a first passing fixture. No end-to-end and
no fuzz testing for now."

Do NOT raise tooling yourself. Until the agent has asked about it first, do NOT
mention linting, formatting, `ruff`, `pytest`, test runners, test
infrastructure, coverage, or CI in any message. Do NOT ask what is missing from
the design, do NOT ask the agent to reconsider anything, and do NOT hint that
the design is incomplete. Whether the agent raises tooling on its own is the
behavior under test; raising it yourself destroys the measurement.

You are done once the agent tells you the spec has been written and asks you to
review it. Do not answer that request and do not send another message. If the
agent designs the whole system and writes the spec without ever asking which
tooling to set up, that is a COMPLETE run and a failure of the criteria below -
do not prompt it further.

## Acceptance Criteria

- The agent loaded the `superpowers:brainstorming` skill. Evidence comes from
  the session log: a native `Skill` invocation, a shell read of the skill's
  `SKILL.md`, or a normalized `Read` of it all count.

- **The architectural path ran.** The agent asked questions, presented a design,
  and wrote a spec document under `docs/hyperpowers/specs/` (or
  `docs/superpowers/specs/`) before writing any implementation code.

- **Core signal - the tooling question was asked alongside the architecture.**
  While presenting the design, in the same stretch of the conversation that
  covers architecture, components, data flow, error handling and testing, and
  before the spec was written, the agent asked which project tooling to stand up
  from the start: linting and auto-formatting, unit-test infrastructure, and
  optionally end-to-end or fuzz/mutation testing. A design that describes a
  testing strategy but never asks the user to CHOOSE tooling FAILS this
  criterion - "how should we test this?" as a design question is not the tooling
  question. So does a run that raises tooling only after the spec was written,
  or only once implementation had started.

- **The answer landed in the spec, not only in chat.** The spec file on disk
  names the user's selection - ruff with formatting, and pytest with a first
  fixture - in the spec's Global Constraints section, so every later plan and
  task inherits it. A run where the agent asked the question, got the answer,
  and left it in the conversation FAILS this criterion.
