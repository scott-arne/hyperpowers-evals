# Writing-Plans and a Hidden Component Library: Head and 6.12.0 (2026-10-02)

Pre-registered before the first session, pilot included. The rules below were
fixed and committed before any run launched; results are appended under
Results.

## Question

Two campaigns ran `writing-plans-reuses-component-library` (Harbor): the
release head c89a2b7 built the Deploys page from the component library in
10 of 10 sessions (`../2026-10-02-plans-component-library-baseline/`), and
hyperpowers 6.12.0, without Grounding, also did in 10 of 10
(`../2026-10-02-plans-component-library-612/`). Neither reproduces the field
failure behind hyperpowers BACKLOG item 2, so the fixture is too easy to
test anything about it. The field sessions missed the library under
Grounding as well: the 2026-09-29 predictions-browse plan hand-rolled a sort
toggle mirrored from an existing page and never named the library's toggle
group (the 612 README's Correction).

Harbor gave every session four cues the field did not:
- the README named `src/ui/` as the component library;
- the Overview page imported the library's card, chip and header;
- the library sat in one flat directory imported by relative path;
- the spec said nothing about which page to follow.

In the field (predict-before-structure on the apex-dashboard-angular
template):
- the vendored library (Spartan's helm) is one directory per component,
  reached through a path alias (`@spartan-ng/helm/<name>`);
- the project README does not describe it;
- the pages import only the helm button and dialog and hand-write their
  cards;
- later specs and plans name an existing page to follow.

The question: on a fixture with all four field cues, how often does a plan
build the new page's table and filter from the library, at the release head
and at 6.12.0? Does the head reproduce the field failure, and do the
versions separate?

## Change

None to any skill. The arms differ by the whole version: 312 commits from
v6.12.0 (871cee9) to c89a2b7. The 612 README's Change section lists what
differs in writing-plans: the Grounding paragraph and template section, the
`**Mirror:**` line, the sanctioned `Unknown:` and `Assumption:` entries,
self-review item 4, and the removed `plan-document-reviewer-prompt.md`. The
session-start hook differs as well.

The Mirror line is the reason the comparison is two-sided. Grounding sends
the writer to one real example of each convention it will touch. Here the
nearest example of a sortable, filtered table hand-writes both, so Grounding
could make the head copy it more often, not less.

## Scenario

`writing-plans-reuses-component-library-hard`, new in this campaign, at the
harness pin. It is Harbor rebuilt with the four field cues, and its spec,
data, brief, operator answers and checks are otherwise the original's:
- **The library.** The dashboard starts from the "Keel admin template",
  whose kit is vendored as `vendor/kit/<name>/src/index.js` re-exporting
  `./lib/<name>.js`, one directory per component: a shared `utils` and
  twelve components, alert, badge, button, card, dialog, empty state, filter
  bar, page header, select, data table, tabs and toggle group. The table and
  select are the original's `dataTable` and `selectField` with `kit-`
  classes. The kit has no README and no tests.
- **The alias.** Pages import the kit through package.json subpath imports,
  `"#kit/*": "./vendor/kit/*/src/index.js"`, the way the field's pages reach
  the helm through tsconfig paths. The kit's own files import `#kit/utils`.
- **The pages.** Five pages: Overview, Services, Incidents, On-call and
  Runbooks. Every one imports only `#kit/button` and `#kit/dialog`. Each
  hand-writes its panels, tables, selects, pills and empty messages, with
  the dashboard's own `escapeHtml` (`src/html.js`). No page uses the kit's
  table, select, filter bar, badge, empty state, card, page header, tabs or
  toggle group. The Incidents page hand-writes an open/resolved tab strip
  the kit's tabs would provide.
- **The README.** It describes the dashboard, how to run it, and where the
  pages, server, layout and stylesheet live. It does not mention the kit.
- **The spec.** The original's, with one added sentence under Page:
  "Sorting and the environment filter behave as on the Services page
  (`src/pages/services.js`)." The Services page hand-writes its sort
  headers (`aria-sort`, arrows, `?env=&sort=&dir=` links) and its
  environment `<select>`.
- **What is visible.** The template commit is named "Start from the Keel
  admin template". The layout links `/public/kit.css` and `/public/kit.js`.
  The pages' button and dialog imports show the `#kit/` alias, and
  package.json shows where it points.

**Checks.** The original's, with paths moved to the kit:
- pre: the kit's table and select files exist, along with the Services page,
  the server, the deploys snapshot and the spec, no plan, and no Deploys page;
  `node --test` passes (18 tests).
- post: writing-plans was called; a plan exists; the plan's fenced code calls
  `dataTable(` and `selectField(`; and `git status --porcelain -- src test
  data public vendor package.json` is empty.

**Dry run.** Before this file was committed, `setup.sh` ran in a scratch
directory with `create_base_repo` emulated from `fixtures/template-repo`:
- it built six commits on `feature/deploys-page`, with a clean tree and the
  spec gitignored;
- `node --test` passed 18 of 18;
- a scratch script imported all twelve kit components through `#kit/<name>`
  and rendered each, among them a sorted `dataTable` with `aria-sort` and an
  `emptyState` fallback, and a `filterBar` around a `selectField` that keeps
  the sort;
- `grep` found `#kit/` imports in the pages for `button` and `dialog` only,
  and no mention of the kit, `vendor` or Keel in the README or the spec.

`bun run quorum check` and `test/scenario-pinning.test.ts` passed.

## Arms

- **head (pilot and counted):** hyperpowers c89a2b7, worktree
  `.worktrees/plans-ui-baseline`, the release head, with Grounding.
- **v612 (counted):** hyperpowers v6.12.0, 871cee9, worktree
  `.worktrees/plans-ui-612`, without Grounding. It is the installed plugin
  version and the newest version the field sessions loaded before
  2026-09-29.

Both arms run in this campaign, side by side.

## Pins

In `manifest.tsv` (the batch) and `manifest-pilot.tsv` (the pilot):
- harness: the commit that adds the scenario (evidence commits may follow
  it; harness paths may not);
- head c89a2b7; v612 871cee9;
- model `claude-opus-5-5` via `claude-auto`.

**Grader:** the Gauntlet-Agent on `claude-opus-5-5`.
`logs/measure-launch.sh` refuses to launch unless `GAUNTLET_AGENT_MODEL` is
`claude-opus-5-5`, and records it in each row log.

**Budget** `default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and
`INTERLOCK_PROBE_TRACE` unset. `ANTHROPIC_DEFAULT_OPUS_MODEL` is unset; each
row log records it.

**Claude Code 2.1.287**, as in both earlier campaigns:
- `logs/measure-launch.sh` refuses to launch unless `claude --version` is
  2.1.287, and logs the version before and after each row;
- `tally.py` voids any session whose transcript records a version other than
  2.1.287 alone (see Void Attempts).

**Host instruction files.** Sessions do not load the host `CLAUDE.md` files
above the run directory (since evals 74d2482).

Checked before this file was committed:
- `claude --version` prints 2.1.287;
- `.worktrees/plans-ui-baseline` is at c89a2b7 and `.worktrees/plans-ui-612`
  at 871cee9, both with a clean tree;
- the evals harness paths are clean apart from the new scenario, which is
  committed as the harness pin before this file;
- `GAUNTLET_AGENT_MODEL` is `claude-opus-5-5` in the host shell;
  `ANTHROPIC_MODEL` is unset there, so it is set to `claude-opus-5-5` on the
  launch command itself.

`logs/measure-launch.sh` repeats all four on every row, for the arm the row
names.

## Pilot

One head session from `manifest-pilot.tsv` (`launch-all.sh manifest-pilot.tsv
1`, proc `p0`), launched alone before the batch. The scenario is new, so the
pilot checks the scenario: that quorum's real setup step builds the fixture,
the pre-checks pass, and the operator follows the brief. Both arms'
provisioning ran in the earlier campaigns at the same Claude Code version.

**Instrument check.** The pilot passes when all five hold:
- setup and every pre-check pass;
- the post phase holds both kit records, the plan record and a
  `skill-called` record;
- the Gauntlet-Agent wrote a result;
- the arm check: the session loaded writing-plans from
  `.worktrees/plans-ui-baseline/skills/writing-plans`, and the Grounding
  instruction ("Ground the plan before you write it") appears in it;
- by hand: the operator sent the brief exactly, did not mention `vendor/kit`,
  `#kit`, the kit, the template, reuse or the Services page, and the
  session reached a plan or a refusal.

Whether the pilot used the kit is reported with no reading, and it does not
gate the batch. A failed instrument check means the scenario or the launcher
is fixed, this README is amended in a commit before the batch (the harness
pin moves with it), and the pilot runs again. A void attempt is relaunched
under the void rules as `r0`.

## Size

4 manifest rows, each one `quorum run --repeat 5` process, in the order head
`p1`, v612 `p1`, head `p2`, v612 `p2`: 20 sessions, 10 per arm, 2
concurrent, so each arm's rows run alongside the other arm's.

## Decision Rules

**Primary measure.** As in both earlier campaigns: a session counts as using
the kit when both of its deterministic post-checks on the plan's fenced code
pass, the one that finds `dataTable(` and the one that finds `selectField(`.
A counted session missing either record is read from its plan files with the
same rule (fenced lines only, the fence state reset per file) and named in
Results. A session that wrote no plan counts as not using the kit and is
named.

**Reproduction, per arm.** The baseline's bands, applied to each arm:

| Used the kit | Reading |
|---|---|
| 6 or fewer of 10 | reproduces: plans do not build the page from the kit |
| 7 or 8 of 10 | both arms extended once to n=20 |
| 9 or 10 of 10 | does not reproduce |
| 15 or fewer of 20 | reproduces |
| 16 or 17 of 20 | weak: the human partner decides |
| 18 or more of 20 | does not reproduce |

If either arm's count is 7 or 8 of 10, both arms extend, and both are read
at n=20.

**Version comparison.** A two-sided Fisher exact test over the two arms'
counts at the final n. p below 0.05 means separated, in the direction
observed; otherwise not separated. At n=10 per arm, 10 of 10 separates from
5 or fewer (p 0.033), 9 from 3 or fewer (p 0.020), 8 from 2 or fewer
(p 0.023). At n=20 per arm, 20 of 20 separates from 15 or fewer (p 0.047)
and 18 from 11 or fewer (p 0.031).

**Extension.** `manifest-extend.tsv`, four rows with the same pins, in this
order: head `p3`, v612 `p3`, head `p4`, v612 `p4`. It is written and
committed before it launches.

**Why these edges.** The reproduction bands are the baseline's, chosen for
what a later fix campaign could show against the count. A fix that used the
kit in every session would separate from 6 of 10 (one-sided Fisher p 0.043)
and from 15 of 20 (p 0.024), and not reliably from 7 of 10 (p 0.105) or from
16 or 17 of 20 (p 0.053, 0.115).

**What the tables can tell apart.** If an arm uses the kit in a fraction r
of such sessions, and only its own count decides whether it extends, the
probability of each reproduction reading is:

| r | reproduces | weak | does not reproduce |
|---|---|---|---|
| 0.3 | 1.00 | 0.00 | 0.00 |
| 0.5 | 0.99 | 0.00 | 0.01 |
| 0.6 | 0.92 | 0.03 | 0.05 |
| 0.7 | 0.72 | 0.12 | 0.16 |
| 0.8 | 0.34 | 0.25 | 0.41 |
| 0.9 | 0.04 | 0.15 | 0.80 |
| 0.95 | 0.00 | 0.04 | 0.96 |

An extension the other arm triggers adds this arm's sessions and reads it at
n=20.

The version comparison is weak at this size. With both arms extending
whenever either lands at 7 or 8, the probability that it separates is:

| head r | v612 r | separated |
|---|---|---|
| 0.9 | 0.3 | 0.83 |
| 0.9 | 0.5 | 0.48 |
| 0.95 | 0.6 | 0.45 |
| 0.5 | 0.9 | 0.48 |
| 0.3 | 0.9 | 0.83 |
| 0.5 | 0.2 | 0.17 |
| 0.6 | 0.6 | 0.02 |
| 0.9 | 0.9 | 0.01 |

A not-separated comparison is therefore not evidence that the versions
behave alike.

**Validity.** Per arm, as before: two records are checked, the post-check
`skill-called` record and whether a plan exists. These sessions stay counted
and are named in Results. If more than a fifth of an arm's counted sessions
are like this (3 or more of 10, 5 or more of 20), no reading is taken for
that arm or the comparison, and the human partner decides. If an arm's
sessions with no plan decide its reading, Results says so.

**Arm check.** A counted session that loaded writing-plans must have loaded
it from its arm's worktree (`plans-ui-baseline` for head, `plans-ui-612` for
v612), and its transcript must carry the Grounding instruction for head and
not for v612. One counted session failing it means no reading is taken; the
human partner decides.

**The composed final is a readout, not a guard.** Every counted session whose
composed final did not pass is read by hand, naming the criterion it failed.

**Consequence.** By the head's reading, since a fix would be built on the
release head:
- **Head reproduces:** the fixture is the failing baseline that item 2's
  plan-writing half lacked. No skill change comes from this campaign. The
  human partner decides whether to draft one through writing-skills and
  measure it on this scenario against this count. The hand-read classes say
  what such a change would target. If the comparison separates with v612
  higher, the version makes the failure worse here, and the Mirror line is
  the first suspect.
- **Head does not reproduce, v612 reproduces:** the version avoids the
  failure on this fixture. Grounding is the likeliest cause, but the arms
  differ by 312 commits. The field missed under Grounding, so what still
  separates this fixture from the field is the next suspect. No skill
  change.
- **Neither reproduces:** the four field cues together do not reproduce the
  failure, with or without Grounding. The candidates left are what the
  fixture still lacks:
  - framework components in place of plain functions;
  - the template's size;
  - a long session that has already planned earlier pages;
  - a brainstormed spec that describes the page to copy in detail.

  No skill change. The human partner decides whether the plan-writing half
  of item 2 closes.
- **Head weak, or no reading:** the human partner's call.

**Hand-read.** Every counted session is read by hand. Each session that did
not use the kit gets one of these classes:
- (a) copied the Services page: its own `<table>` and `<select>` markup, the
  dashboard's pill classes, `escapeHtml`;
- (b) used some kit parts (for example `badge`, `emptyState`, `filterBar` or
  `pageHeader`), but not the table or the select;
- (c) other, described.

Each such session also records whether the plan mentions `vendor/kit` or the
`#kit/table` and `#kit/select` aliases, and the reason it gives for not
using them, if any.

Every session records:
- what its plan's Grounding section and `**Mirror:**` lines cite (Services,
  a kit file, another page);
- whether it saw the kit's table and select before writing (a Read of the
  file, a listing or search that names them, or `package.json`'s imports
  map followed to them), and whether it read the Services page and the
  README;
- whether it asked the operator about the kit or the Services page;
- whether it began executing the plan after writing it.

The deterministic count governs the reading; the hand-read explains it.

**Readouts, with no reading attached.** From `tally.py`, per arm:
- the two-sided Fisher p;
- sessions where the records and the plan files disagree;
- plan code calling each of `dataTable(`, `selectField(`, `filterBar(`,
  `badge(`, `emptyState(`, `pageHeader(` and `card(`;
- plan code writing its own `<table` or `<select` markup, all lines and
  lines outside assertions (lines without `assert`; the cut is per line, so
  an expected-markup literal on its own line in a test counts as outside,
  and the hand-read settles it);
- plan code using the dashboard's `pill` classes or `escapeHtml`;
- plans naming `vendor/kit` or `#kit/` anywhere, plans naming `#kit/table`
  or `vendor/kit/table`, and plans naming `services.js`;
- what the Grounding sections cite (the kit, `services.js`, both, neither,
  or no Grounding section), and what the `**Mirror:**` lines cite;
- sessions that read a kit file, the kit's table or select, `services.js`,
  `package.json` or the README, counting a Bash command whose glob expands
  to the file;
- sessions in which a tool result showed `dataTable` or `selectField`, or
  named `vendor/kit`, before the plan was first written;
- Skill calls; sessions and calls using `AskUserQuestion`; sessions
  dispatching an Agent;
- sessions that changed source, test, data, public or vendored files or
  package.json;
- sessions with an auto compaction (none expected);
- sessions whose composed final did not pass.

## Void Attempts

As in both earlier campaigns, following the evals void-attempt rule:

- **Grader exit** (`verdict.json` status `investigate`, "gauntlet exited
  ... without writing a result", transport error in
  `gauntlet-agent/gauntlet-stderr.log`): replaced. At most three further
  attempts per arm.
- **Harness setup** (null `gauntlet`, "quorum error (setup): setup.sh failed",
  the sandbox EPERM signature): relaunched. Does not consume the cap.
- **A real indeterminate** (the coding agent failed, stalled, or produced no
  usable transcript, or the Gauntlet-Agent returned `investigate` on a
  completed session): re-run once. Indeterminate twice stays indeterminate.
  The primary measure is deterministic, so a session whose plan code calls
  both counts as using the kit whatever the composed final says, and one
  whose plan code does not counts as not using it. If an indeterminate
  decides a reading, Results says so.
- **Claude Code version** (a session whose transcript records any version
  other than 2.1.287 alone): replaced while the host is still at 2.1.287.
  Does not consume the cap. If the host has moved on,
  `logs/measure-launch.sh` refuses to launch; Results then reports the
  counts without a reading, and the human partner decides whether to
  re-pin.

The pilot follows the same rules, and none of its attempts is counted. Every
void attempt is recorded here with its stderr. A superseded indeterminate is
listed in `superseded.txt`, which `tally.py` reads.

## Mutation Checks

Each window has an epoch stamp, written immediately before launch:
- `logs/pilot-window-start.txt` for the pilot;
- `logs/batch-window-start.txt` for the batch;
- `logs/extend-window-start.txt` for an extension.

Both worktrees are checked before the pilot, after the pilot, before the
batch, after the counted sessions, and after archiving, and before and after
an extension. `.worktrees/plans-ui-612` is not used by the pilot, and is
checked then anyway.

Each check:
- `find` over the worktree outside `.git` reports no file newer than the
  stamp;
- the worktree's `HEAD` equals its pin;
- `git status --short` is empty.

## Limits

- **The whole version differs.** As in the 612 campaign: a separation says
  the version matters on this fixture, not which change does.
- **The comparison is weak.** See the separation table: rate differences of
  0.4 separate about half the time. A not-separated comparison is not
  evidence that the versions behave alike.
- **Still not the field.** Plain functions, not Angular components; five
  small pages, not a large template; one fresh session per plan, not a long
  session that has planned earlier pages; a short spec written for the
  fixture. The four cues are the field's, the rest is not.
- **Designed cues, designed together.** All four cues are stacked, so a
  reproduction says the four together are enough, not which one matters.
  Separating them would need one arm per cue.
- **Scope of the artifact.** Plans only, not implementation or review.
- **Power.** The reproduction table does not reliably classify a rate near
  0.8.
- **Scope.** One scenario, one model, one Claude Code version, one fixture.

## Files

- `manifest.tsv` and `manifest-pilot.tsv`, and `manifest-extend.tsv` if an
  extension runs.
- `launch-all.sh`, copied from the 612 campaign unchanged apart from its
  provenance line.
- `logs/measure-launch.sh`, adapted from the 612 campaign's: the evidence
  directory, and both arms run in the batch.
- `archive-runs.sh`, adapted from the 612 campaign's: the evidence
  directory.
- `logs/`: one log per row with the pins, the command, and quorum's `trials:`
  output, plus the window stamps, `launch-all.out` and `mutation-checks.txt`.
  Replacements and re-runs under the void rules are logged as `r<n>`.
- `runs/head/<run-id>/` and `runs/v612/<run-id>/`: the run archives,
  stripped per `../README.md`.
- `tally.py` and its output `tally.txt`: the decision rules over the
  archives.
- `handread.md`: the hand-reads named above.

## Results

Pending.
