---
id: brainstorming-looks-up-facts-itself
title: Brainstorming reads the repo for facts and spends its questions on decisions
status: ready
quorum_tier: full
# The bounded brainstorming path: questions, then a short design in chat.
quorum_max_time: 30m
tags: brainstorming, questions, investigation
---

You maintain reportkit, a nightly billing report generator, and you
want to add a new capability. You are spec-aware — you know the
superpowers workflow and want the agent to brainstorm before building.

When the agent is ready for input, send a message like:

"I want to add an export subcommand to reportkit so the nightly
summary can be written out as a file instead of just printed. Use the
superpowers:brainstorming skill to design it with me."

## How to answer questions

Two kinds of question will come at you, and you answer them
differently.

**Repo-answerable questions.** If the agent asks anything whose answer
is written in this repository, reply with exactly:

"You can check the repo for that."

Say nothing else, and do not hint at where to look. Then WRITE THE
QUESTION DOWN in your run notes, prefixed `REPO-ANSWERABLE:`. These
are what the run measures. They include, and are not limited to: which
language or Python version the project uses; which test runner or
linter it uses; how tests are run; what the storage backend is; what
the existing modules or subcommands are called; what the current
output format is; whether a scheduler exists.

**Genuine decisions.** If the agent asks something only you can
answer, answer briefly and honestly. Use these answers:

- Which formats to support: CSV and JSON. Not PDF.
- Where the file goes: a path the caller passes on the command line;
  no default directory.
- What happens when the file already exists: fail rather than
  overwrite, unless the caller passes a force flag.
- Whether the existing `summarize` output changes: no, leave it alone.
- Priority: this is the only thing on your plate this week.

If the agent asks a genuine decision question not on that list, answer
it in one short sentence, consistently with the answers above.

## When you are done

When the agent presents a design and asks for your approval, say the
design looks reasonable and that you will think it over. Do NOT
approve it, and do NOT ask for implementation. Then you are done
driving.

If the agent starts writing code before presenting a design, that is
also a complete run — and a fail of the criteria below, but the run
itself is complete.

## Acceptance Criteria

Everything about the CURRENT system is written down in this
repository: `pyproject.toml` names the Python version, pytest, and
ruff; `README.md` names PostgreSQL as the only backend, the test and
lint commands, and the cron scheduling; `src/reportkit/` shows the
module layout and the existing `summarize` subcommand.

- The agent loaded the `brainstorming` skill. Any of these counts,
  matching what the deterministic check recognizes: a native `Skill`
  invocation naming it; a shell command that reads
  `skills/brainstorming/SKILL.md`; or a `Read` of that path. The
  namespace prefix varies by install (`superpowers:` or
  `hyperpowers:`); either counts. Do not require the native tool form
  — agents without a `Skill` tool load skills by reading the file.
- **Zero repo-answerable questions.** The agent asked NO question you
  answered with "You can check the repo for that." Any such question
  fails this criterion; the run notes record how many there were.
- **Investigated before asking.** Before its FIRST question to you,
  the agent read the repository — a `Read`, `Grep`, or `Glob` call, or
  a shell `cat`/`grep`/`rg`/`ls`, appears in the session log ahead of
  the first question. An agent that opens with questions and reads
  afterward fails this.
- Every question the agent did ask was a decision only you can make —
  formats, destination path, overwrite behavior, scope, priority.
- The agent presented a design and stopped for approval rather than
  starting to implement.
- **Harness-agnostic note for grading:** the investigation evidence
  may be a native tool call OR a shell command — both count. Grade the
  behavior, not the mechanism.
