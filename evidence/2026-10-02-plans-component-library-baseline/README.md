# Writing-Plans and an Existing Component Library: Baseline (2026-10-02)

Pre-registered before the first session, pilot included. The rules below were
fixed and committed before any run launched; results are appended under
Results.

## Question

A field report (hyperpowers BACKLOG item 2): the human partner used
hyperpowers to build predict-before-structure, a dashboard started from the
apex-dashboard-angular admin template. The plans did not use the template's
existing UI elements. The pages were built with their own markup instead.
Reading those sessions suggested a cause. The plan writer never looked for a
component library and copied whatever existing page it had read. The
implementers then copied the plan's code, and the reviewers rarely flagged
it.

That work ran on the installed plugin, 6.12.0, whose writing-plans has no
Grounding section. The release head (6.15.0) adds one to the plan template: "For each convention the work will touch, find one real
example in the codebase and record it in the Grounding section". Grounding
could fix the failure by sending the writer to look for a library. It could
also reinforce it, because the nearest real example is the hand-written page.

The question: at the release head, on a repository whose component library
already has every control a new page needs, and whose most similar existing
page was written by hand, how often does the plan build the page's table and
filter from the library?

## Change

None. This is the baseline. If it reproduces the failure, the fix it would
test is a required "UI components used" slot in the writing-plans template,
keyed to an observable predicate (the repository has a component library).
That follows the writing-skills rule for an omitted element: "Structural:
REQUIRED field or slot in the template they fill in". The fix gets its own
pre-registration (see Consequence).

## Scenario

`writing-plans-reuses-component-library`, new, at the harness pin (commit
2dbae1fee).
- **Fixture.** Harbor, a server-rendered Node dashboard with no
  dependencies. It has 28 tracked files, about 27 KB of code, docs and data.
  The first commit vendors an admin template's component library in
  `src/ui/`. The library holds `dataTable` (sortable, with sort links and
  `aria-sort`), `selectField`, `filterBar`, `statusChip`, `emptyState`,
  `card` and `pageHeader`, with its own CSS and a small script that submits
  a form when a select changes. The README's Layout section names `src/ui/`
  as the template's component library. The Overview page uses `card`,
  `statusChip` and `pageHeader`. The Services page is the existing page most
  like the new one, and it was written by hand: its own `<table>`, its own
  `<select onchange>`, its own pill classes, and its own `escapeHtml`. No
  page uses the library's table or select. `node --test` runs 19 passing
  tests. A third commit adds `data/deploys.json`, and the session starts on
  branch `feature/deploys-page`.
- **Spec**, already written by the human partner, in the gitignored
  `docs/hyperpowers/specs/2026-10-01-deploys-page-design.md`. It describes a
  Deploys page with an environment dropdown, a table with seven columns
  (two of them sortable), colored status chips, a duration column, and an
  empty state. It never mentions `src/ui/` or the Services page, and says
  nothing about how to build the controls. Every control it asks for exists
  in the library.
- **Brief**, sent exactly: "I've written up the spec for the new Deploys page
  in docs/hyperpowers/specs/2026-10-01-deploys-page-design.md. Can you write
  the implementation plan for it? Don't start implementing yet, I want to
  read the plan first."
- **Operator.** Never mentions `src/ui`, the library, the template, reuse,
  or the Services page, and never says how to build the page. Asked whether
  to use `src/ui/` or follow the Services page, it answers "your call, do
  what you'd normally do". It declines brainstorming and spec changes ("the
  spec is final, just the plan please"). It also declines execution ("not
  yet, I'll read the plan first").
- **Checks.** Pre: the branch, the library, the Services page, the server,
  the deploys snapshot and the spec exist; no plan and no Deploys page
  exist; `requires-tool node`; `node --test` passes. Post: writing-plans was
  called; a plan exists under `docs/*/plans/`; the plan's fenced code
  contains `dataTable(`; the plan's fenced code contains `selectField(`;
  nothing under `src`, `test`, `data` or `public` changed.
- **Graded criteria** (`story.md`): writing-plans invoked; a plan exists;
  the plan's page code calls `dataTable` and `selectField`, and a plan whose
  page code writes its own `<table>` or `<select>` fails; no source, test,
  data or public file created or changed.

## Arm

- **control (pilot and counted):** hyperpowers c89a2b7, the head of the
  release branch `external-workflow-adoption` (6.15.0, unreleased), worktree
  `.worktrees/plans-ui-baseline`.

The reading is absolute: it measures how often the release head builds the
page from the library. No treatment runs in this campaign.

## Pins

In `manifest.tsv` (the batch) and `manifest-pilot.tsv` (the pilot):
- harness 2dbae1fee, the commit that adds the scenario (evidence
  commits may follow it; harness paths may not);
- control c89a2b7 in both;
- model `claude-opus-5-5` via `claude-auto`.

**Grader:** the Gauntlet-Agent on `claude-opus-5-5`, as in the campaigns
before this one. `logs/measure-launch.sh` refuses to launch unless
`GAUNTLET_AGENT_MODEL` is `claude-opus-5-5`, and records it in each row log.

**Budget** `default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and
`INTERLOCK_PROBE_TRACE` unset. `ANTHROPIC_DEFAULT_OPUS_MODEL` is unset; each
row log records it.

**Claude Code 2.1.287**, pinned as before:
- `logs/measure-launch.sh` refuses to launch unless `claude --version` is
  2.1.287, and logs the version before and after each row;
- `tally.py` voids any session whose transcript records a version other than
  2.1.287 alone (see Void Attempts).

**Host instruction files.** Sessions do not load the host `CLAUDE.md` files
above the run directory (since evals 74d2482).

Checked before this file was committed:
- `claude --version` prints 2.1.287;
- `.worktrees/plans-ui-baseline` is at c89a2b7 with a clean tree;
- the evals harness paths are clean and identical to 2dbae1fee;
- `GAUNTLET_AGENT_MODEL` is `claude-opus-5-5` in the host shell;
  `ANTHROPIC_MODEL` is unset there, so it is set to `claude-opus-5-5` on the
  launch command itself.

`logs/measure-launch.sh` repeats all four on every row.

## Pilot

One session from `manifest-pilot.tsv` (`launch-all.sh manifest-pilot.tsv 1`,
proc `p0`), launched alone before the batch. It runs the same arm as the
batch, and nothing changes between them unless the instrument check fails.

**Instrument check.** The pilot passes when all four hold:
- setup and every pre-check pass;
- the post phase holds both library records, the plan record and a
  `skill-called` record;
- the Gauntlet-Agent wrote a result;
- by hand: the operator sent the brief exactly, gave no cue about how to
  build the page, and the session reached a plan or a refusal.

Whether the pilot used the library is reported with no reading, and it does
not gate the batch. A failed instrument check means the scenario is fixed,
this README is amended in a commit before the batch (the harness pin moves
with it), and the pilot runs again. A void attempt is relaunched under the
void rules as `r0`.

## Size

2 manifest rows, each one `quorum run --repeat 5` process: 10 sessions, 2
concurrent.

## Decision Rules

**Primary measure.** A session counts as using the library when both of its
deterministic post-checks on the plan's fenced code pass: the one that finds
`dataTable(` and the one that finds `selectField(`. A counted session missing
either record is read from its plan files with the same rule (fenced lines
only, the fence state reset per file) and named in Results. A session that
wrote no plan counts as not using the library and is named.

| Control, used the library | Reading |
|---|---|
| 6 or fewer of 10 | reproduces: plans do not build the page from the library |
| 7 or 8 of 10 | extended once to n=20 |
| 9 or 10 of 10 | does not reproduce |
| 15 or fewer of 20 | reproduces |
| 16 or 17 of 20 | weak: the human partner decides |
| 18 or more of 20 | does not reproduce |

An extension is `manifest-extend.tsv`, two rows (`p3`, `p4`) with the same
pins. It is written and committed before it launches.

**Why these edges.** The bands follow what a later fix campaign could show
against this count. A fix that used the library in every session would
separate from a count of 6 of 10 (one-sided Fisher p 0.043) and from 15 of
20 (p 0.024). It would not reliably separate from 7 of 10 (p 0.105) or from
16 or 17 of 20 (p 0.053, 0.115). "Does not reproduce" means a fix would
have too little room to show.

**What the table can tell apart.** If the release head uses the library in a
fraction r of such sessions, the probability of each reading is:

| r | reproduces | weak | does not reproduce |
|---|---|---|---|
| 0.5 | 0.99 | 0.00 | 0.01 |
| 0.6 | 0.92 | 0.03 | 0.05 |
| 0.7 | 0.72 | 0.12 | 0.16 |
| 0.8 | 0.34 | 0.25 | 0.41 |
| 0.9 | 0.04 | 0.15 | 0.80 |
| 0.95 | 0.00 | 0.04 | 0.96 |

Rates near 0.8 are not reliably classified either way.

**Validity.** Two records are checked: the post-check `skill-called` record,
and whether a plan exists. A session that never loads writing-plans has not
tested the skill. A session that writes no plan has not been measured.
These sessions stay counted and are named in Results. If more than a fifth
of the counted sessions are like this (3 or more of 10, 5 or more of 20), no
reading is taken and the human partner decides. If the sessions with no plan
decide the band, Results says so.

**The composed final is a readout, not a guard.** The graded criteria share
the primary measure and add no implementation. A session can build the page
from the library and still fail the final by implementing. Every counted
session whose composed final did not pass is read by hand, naming the
criterion it failed.

**Consequence.**
- **Reproduces:** the "UI components used" slot is drafted under
  writing-skills. It gets its own pre-registration on this scenario at the
  same pins, and this count is that campaign's control. It reaches the
  release branch only through that campaign, as a diff for the human
  partner's approval.
- **Does not reproduce:** no skill change comes from this campaign. Results
  reports that the release head built the page from the library, with the
  hand-read on what led it there (Grounding, the README, the Overview
  page). The human partner decides whether a harder fixture is worth
  building (see Limits) or whether the plan-writing part of item 2 closes.
- **Weak or no reading:** the human partner's call.

**Hand-read.** Every counted session is read by hand.

Each session that did not use the library is classified:
- (a) copied the Services page's pattern: its own `<table>` and `<select>`
  markup, its own chip classes;
- (b) used some library parts (for example `statusChip` or `pageHeader`),
  but not the table or the select;
- (c) other, described.

Each such session also records whether the plan mentions `src/ui/`, and
whether it gives a reason for not using it.

Every session records:
- what its Grounding section and any `**Mirror:**` lines cite;
- whether it read `src/ui/` files, the Services page, and the README;
- whether it asked the operator about the library or the Services page;
- whether it began executing the plan after writing it.

The deterministic count governs the reading; the hand-read explains it.

**Readouts, with no reading attached.** From `tally.py`:
- the one-sided Fisher p for a perfect fix against this count;
- sessions where the records and the plan files disagree;
- plan code calling each of `dataTable(`, `selectField(`, `statusChip(`,
  `emptyState(` and `filterBar(`;
- plan code writing its own `<table` or `<select` markup;
- plans naming `src/ui` or `services.js` anywhere;
- what the Grounding sections cite (`src/ui`, `services.js`, both, neither,
  or no Grounding section);
- sessions that read a `src/ui/` file or `services.js`;
- Skill calls; sessions and calls using `AskUserQuestion`; sessions
  dispatching an Agent;
- sessions that changed source, test, data or public files;
- sessions with an auto compaction (none expected);
- sessions whose composed final did not pass.

## Void Attempts

Fixed before the runs, per the evals void-attempt rule, as in the campaigns
before this one:

- **Grader exit** (`verdict.json` status `investigate`, "gauntlet exited
  ... without writing a result", transport error in
  `gauntlet-agent/gauntlet-stderr.log`): replaced. At most three further
  attempts.
- **Harness setup** (null `gauntlet`, "quorum error (setup): setup.sh failed",
  the sandbox EPERM signature): relaunched. Does not consume the cap.
- **A real indeterminate** (the coding agent failed, stalled, or produced no
  usable transcript, or the Gauntlet-Agent returned `investigate` on a
  completed session): re-run once. Indeterminate twice stays indeterminate.
  The primary measure is deterministic, so a session whose plan code calls
  both counts as using the library whatever the composed final says, and
  one whose plan code does not counts as not using it. If an indeterminate
  decides the reading, Results says so.
- **Claude Code version** (a session whose transcript records any version
  other than 2.1.287 alone): replaced while the host is still at 2.1.287.
  Does not consume the cap. If the host has moved on,
  `logs/measure-launch.sh` refuses to launch; Results then reports the count
  without a reading, and the human partner decides whether to re-pin.

The pilot follows the same rules, and none of its attempts is counted. Every
void attempt is recorded here with its stderr. A superseded indeterminate is
listed in `superseded.txt`, which `tally.py` reads.

## Mutation Checks

Each window has an epoch stamp, written immediately before launch:
- `logs/pilot-window-start.txt` for the pilot;
- `logs/batch-window-start.txt` for the batch.

Both are checked against `.worktrees/plans-ui-baseline`: before the pilot,
after the pilot, before the batch, after the counted sessions, and after
archiving.

Each check:
- `find` over the worktree outside `.git` reports no file newer than the
  stamp;
- the worktree's `HEAD` equals c89a2b7;
- `git status --short` is empty.

## Limits

- **The fixture is easier than the field.** Harbor is small enough to read
  whole. Its README names `src/ui/` as the component library, and one page
  already uses three library components. The field repository was an Angular
  template, larger, with its library spread across modules. A count that
  does not reproduce is weaker evidence that the problem is gone than a
  count that reproduces is evidence that it remains.
- **Functions, not framework components.** The library is plain functions
  returning HTML strings. Angular components, modules and selectors are not
  tested.
- **Plans only.** Whether implementers follow a plan that uses the library,
  and whether reviewers catch one that does not, is not measured.
- **The handoff.** writing-plans hands off to Subagent-Driven Development by
  default. The brief says not to start yet, and the operator declines
  execution. A session that implements anyway is still counted on its plan,
  and named.
- **The operator's "your call".** A session that asks about the library has
  already found it. It is counted on its plan like any other.
- **Power.** The table does not reliably classify a library-use rate near
  0.8 (see Decision Rules).
- **Scope.** One scenario, one model, one Claude Code version, one fixture.

## Files

- `manifest.tsv` and `manifest-pilot.tsv`, and `manifest-extend.tsv` if an
  extension runs.
- `launch-all.sh`, copied unchanged from the over-trigger campaign
  (`../2026-10-02-companion-over-trigger/`).
- `logs/measure-launch.sh`, adapted from the over-trigger campaign's: the
  evidence directory, and the control arm only.
- `archive-runs.sh`, adapted from the over-trigger campaign's: the evidence
  directory, and the control arm only.
- `logs/`: one log per row with the pins, the command, and quorum's `trials:`
  output, plus the two window stamps and `launch-all.out`. Replacements and
  re-runs under the void rules are logged as `r<n>`.
- `runs/control/<run-id>/`: the run archives, stripped per `../README.md`.
- `tally.py` and its output `tally.txt`: the decision rules over the archive.
- `handread.md`: the hand-reads named above.

## Results

Pending.
