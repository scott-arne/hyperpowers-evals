# Writing-Plans and a Component Library in a Large Repository: Head and 6.12.0 (2026-10-02)

Pre-registered before the first session, pilot included. The rules below were
fixed and committed before any run launched; results are appended under
Results.

## Question

The hard campaign (`../2026-10-02-plans-component-library-hard/`) gave
Harbor the four field cues behind hyperpowers BACKLOG item 2:
- the library vendored one directory per component and reached through an
  alias;
- a README that does not describe it;
- pages that import only its button and dialog and hand-write the rest;
- a spec that names an existing page to follow.

The release head c89a2b7 and hyperpowers 6.12.0 both built the Deploys page
from the kit in 10 of 10 sessions (two-sided Fisher p 1.0). Its hand-read
says how they found it. In all 21 sessions, pilot included, the first tool
result that named the kit was call 2's `git ls-files`, which listed 52
tracked files, 26 of them under `vendor/kit/`, and call 4 read every kit
file. The field app tracks 863 files, 253 of them in its `ui/` library. The
hard Results named the template's size as the candidate this points at,
from the hand-read rather than from a tested cause.

At the field's size a listing no longer fits in what a session sees. When a
tool result passes 30,000 characters, Claude Code moves it to a file and
shows the session the first 2KB and the file's path.

The question: on a fixture with all four field cues at the field's size,
where the part of a full listing a session sees ends long before the kit,
how often does a plan build the new page's table and filter from the kit, at
the release head and at 6.12.0? Does the head reproduce the field failure,
and do the versions separate?

## Change

None to any skill. The arms are the hard campaign's and differ by the whole
version, 312 commits from v6.12.0 (871cee9) to c89a2b7; the 612 README's
Change section lists what differs in writing-plans. The comparison is
two-sided for the hard campaign's reason: Grounding's `**Mirror:**` line
sends the writer to the nearest real example, and here that example
hand-writes its table and select.

## Scenario

`writing-plans-reuses-component-library-large`, new in this campaign, at the
harness pin. It is the hard fixture grown to 917 tracked files. The four
cues, the spec, the deploys snapshot, the brief and the operator answers are
the hard fixture's:
- **The library.** The Keel admin template's kit, vendored as
  `vendor/kit/<name>/src/`, one directory per component, each with
  `src/index.js` re-exporting one or more `src/lib/*.js`: 47 directories,
  248 files. They are the hard fixture's shared `utils` and twelve
  components, and thirty-four more from the same template: accordion,
  aspect ratio, avatar, breadcrumb, calendar, checkbox, collapsible,
  command menu, context menu, date picker, dropdown menu, hover card,
  input, input group, OTP input, keyboard key, label, menubar, navigation
  menu, popover, progress, radio group, scroll area, separator, sheet,
  sidebar, skeleton, slider, spinner, switch, textarea, toast, toggle and
  tooltip. The table and select are the hard fixture's `dataTable` and
  `selectField`. The kit has no README and no tests.
- **The alias.** Pages import the kit through package.json subpath imports,
  `"#kit/*": "./vendor/kit/*/src/index.js"`, as in the hard fixture.
- **The pages.** Thirty: the hard fixture's five (Overview, Services,
  Incidents, On-call and Runbooks) and twenty-five more written the same
  way, from Alerts to Webhooks. Eleven import `#kit/button`, five of those
  also `#kit/dialog`, and nineteen import nothing from the kit. Each
  hand-writes its panels, tables, selects, pills and empty messages, with
  the dashboard's own `escapeHtml`. No page uses any other kit component.
- **The rest.** Core helpers, shared schemas, the snapshot pipeline (jobs,
  upstream clients, recorded upstream responses, fixtures and database
  migrations), tools, scripts, end-to-end tests and icons. Tracked files
  per top-level directory: `data` 30, `pipeline` 354, `public` 13,
  `scripts` 3, `src` 117, `test` 118, `tools` 28, `vendor` 248, and six at
  the root.
- **The README.** It describes the dashboard, how to run it, the pages, the
  server, the layout, the stylesheet and the pipeline. It does not mention
  the kit.
- **The spec.** The hard fixture's, unchanged: the Deploys page's sorting
  and environment filter "behave as on the Services page
  (`src/pages/services.js`)", which hand-writes both.
- **What is visible.** As in the hard fixture, the template commit is named
  "Start from the Keel admin template", the layout links `/public/kit.css`
  and `/public/kit.js`, `public/kit.css` names Keel, the pages' button and
  dialog imports show the `#kit/` alias, and package.json shows where it
  points. What is new is the listing: `git ls-files` prints 33,620 bytes,
  and its first 2KB, sorted bytewise, ends in `pipeline/db/migrations/`,
  before `public/`, `src/`, `test/`, `tools/` and `vendor/`.

**Checks.** The hard fixture's, with two changes:
- pre: one added check, that `git ls-files | wc -c` exceeds 30,000.
  `node --test` passes (380 tests).
- post: the no-implementation check also covers `pipeline`, `tools` and
  `scripts`. It reads `git status --porcelain -- src test data public
  vendor package.json pipeline tools scripts`, which must be empty.

**Dry run.** Before this file was committed, `setup.sh` ran in a scratch
directory with `create_base_repo` emulated from `fixtures/template-repo`:
- it built six commits on `feature/deploys-page`, with a clean tree and the
  spec gitignored: 917 tracked files and a 33,620-byte listing;
- it ran in about 3 seconds, and rebuilds gave the same tree hash;
- `node --test` passed 380 of 380;
- `grep` found `#kit/` imports for `button` (eleven pages) and `dialog`
  (five) only, no `dataTable` or `selectField` outside `vendor/`, and no
  mention of the kit, `vendor` or Keel in the README or the spec;
- the size pre-check fails on the hard fixture (1,380 bytes), so the check
  catches a fixture that has lost its size.

`bun run quorum check` and `test/scenario-pinning.test.ts` passed.

**Persisted output.** The campaign assumes Claude Code moves the full
listing to a file. Two checks so far, neither a quorum session on this
fixture:
- In the maintainer session that built the fixture (Claude Code 2.1.284), a
  `git ls-files` in the scratch fixture came back as `<persisted-output>`,
  a 2KB preview, and the path of a file holding all 917 lines.
- On 2.1.287, the hard pilot (`000355Z-e4fc`) had a 31.3KB tool result
  moved to a file the same way, and Read that file in its next call.

The pilot reports whether this fixture's listing is persisted at 2.1.287
(see Pilot).

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

**Claude Code 2.1.287**, as in the earlier campaigns:
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
pilot checks it: that quorum's real setup step builds the fixture, the
pre-checks pass (the size check and the 380-test suite among them), and the
operator follows the brief.

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
gate the batch. So are whether a tool result was moved to a file before the
plan was written, whether the session read such a file, and which call first
named `vendor/kit`.

One condition holds the batch without failing the pilot. If the pilot ran a
full listing (`git ls-files`, or a `find` over the whole tree) and its
transcript shows all of it rather than a persisted-output preview, the size
does not do what this campaign assumes at 2.1.287. The batch then waits and
the human partner decides.

A failed instrument check means the scenario or the launcher is fixed, this
README is amended in a commit before the batch (the harness pin moves with
it), and the pilot runs again. A void attempt is relaunched under the void
rules as `r0`.

## Size

4 manifest rows, each one `quorum run --repeat 5` process, in the order head
`p1`, v612 `p1`, head `p2`, v612 `p2`: 20 sessions, 10 per arm, 2
concurrent, so each arm's rows run alongside the other arm's.

## Decision Rules

**Primary measure.** As in the earlier campaigns: a session counts as using
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
  what such a change would target, and the found-by readouts say whether
  the sessions that missed the kit ever saw its path. If the comparison
  separates with v612 higher, the version makes the failure worse here, and
  the Mirror line is the first suspect.
- **Head does not reproduce, v612 reproduces:** the version avoids the
  failure on this fixture. Grounding is the likeliest cause, but the arms
  differ by 312 commits. The field missed under Grounding, so what still
  separates this fixture from the field is the next suspect. No skill
  change.
- **Neither reproduces:** the four field cues at the field's size do not
  reproduce the failure, with or without Grounding. The candidates left
  are what the fixture still lacks:
  - framework components in place of plain functions;
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

Every session records how it found the kit, if it did, by the first call
that showed it the kit's path or contents:
- (f1) read the persisted output file of a full listing;
- (f2) a listing narrow enough to show `vendor/` in full: `ls` of the root
  or `vendor/`, `ls -R`, `tree`, `find` or `git ls-files` with a path or a
  filter;
- (f3) followed the `#kit/` alias from a page's import to package.json's
  imports map;
- (f4) a content search (`grep`, the Grep tool) whose results name
  `vendor/kit`;
- (f5) other, described;
- (f6) did not find it before writing the plan.

Every session also records:
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
  to the file; the kit's files are listed from each run's archived fixture;
- sessions in which a tool result showed `dataTable` or `selectField`, or
  named `vendor/kit`, before the plan was first written;
- new here, all before the plan was first written and all read from what
  the session saw (a moved result counts as its preview):
  - sessions in which a tool result was moved to a file, and sessions in
    which a tool call named such a file;
  - sessions in which a tool call's input or result named `vendor/kit`,
    and for each, that call's ordinal among the session's tool calls and a
    one-line summary; a call's input counts because `ls vendor` prints
    only `kit`, so a session that lists its way down first names the path
    in its next call;
  - sessions in which a tool result showed `#kit/`, and how many of those
    saw it before `vendor/kit` was named;
- Skill calls; sessions and calls using `AskUserQuestion`; sessions
  dispatching an Agent;
- sessions that changed source, test, data, public, vendored, pipeline,
  tool or script files or package.json;
- sessions with an auto compaction (none expected);
- sessions whose composed final did not pass.

## Void Attempts

As in the earlier campaigns, following the evals void-attempt rule:

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

- **The size hides the kit only from a full listing.** A session can still
  find it in many ways:
  - read the persisted file, as the hard pilot did with a different output;
  - list the root, where `vendor/` is one of nine directories;
  - run `ls -R`, `tree`, `find vendor`, or a filtered `git ls-files`, all
    of which fit under the threshold;
  - follow a page's `#kit/` import to package.json;
  - search for `table` or `select`.

  A non-reproduction says the size was not enough, not that sessions
  ignore listings.
- **The alias still shows the path.** The Services page imports
  `#kit/button` and `#kit/dialog`, and the spec sends every session there.
  The field's pages show the helm's path alias the same way.
- **The bulk is generated.** Twenty-five pages, the pipeline, the tools and
  the extra kit components come from a seeded generator and follow a few
  templates. A session that notices may treat the repository as synthetic.
- **Still not the field.** Plain functions, not Angular components; the kit
  at the repository's root, not under a `libs/ui` tree; one fresh session
  per plan, not a long session that has planned earlier pages; the spec is
  short and written for the fixture. The size is about the field's: 917
  tracked files against 863, 248 of them in the kit against 253.
- **The whole version differs.** As in the 612 and hard campaigns: a
  separation says the version matters on this fixture, not which change
  does.
- **The comparison is weak.** See the separation table: rate differences of
  0.4 separate about half the time. A not-separated comparison is not
  evidence that the versions behave alike.
- **Designed cues, designed together.** The four cues and the size are
  stacked, so a reproduction says they are enough together, not which one
  matters.
- **Scope of the artifact.** Plans only, not implementation or review.
- **Power.** The reproduction table does not reliably classify a rate near
  0.8.
- **Scope.** One scenario, one model, one Claude Code version, one fixture.

## Files

- `manifest.tsv` and `manifest-pilot.tsv`, and `manifest-extend.tsv` if an
  extension runs.
- `launch-all.sh`, copied from the hard campaign unchanged apart from its
  provenance line.
- `logs/measure-launch.sh`, adapted from the hard campaign's: the evidence
  directory.
- `archive-runs.sh`, adapted from the hard campaign's: the evidence
  directory.
- `logs/`: one log per row with the pins, the command, and quorum's `trials:`
  output, plus the window stamps, `launch-all.out` and `mutation-checks.txt`.
  Replacements and re-runs under the void rules are logged as `r<n>`.
- `runs/head/<run-id>/` and `runs/v612/<run-id>/`: the run archives,
  stripped per `../README.md`.
- `tally.py` and its output `tally.txt`: the decision rules over the
  archives. Adapted from the hard campaign's: the scenario, the kit's files
  read from each run's fixture, and the found-by readouts.
- `handread.md`: the hand-reads named above.

## Results

**Neither reproduces; not separated.** On the large fixture, every counted
session in both arms built the Deploys page's table and filter from the
Keel kit: all 10 head plans and all 10 6.12.0 plans call both `dataTable(`
and `selectField(` in their fenced code. Each arm reads "does not
reproduce" (9 or 10 of 10), so no extension ran. The two-sided Fisher p is
1.0000, not separated. 10 of 10 excludes kit-use rates below 74% in each
arm (one-sided 95%). Per the pre-registered consequence, the four field
cues at the field's size do not reproduce the failure, with or without
Grounding. No skill change comes from this campaign. The human partner
decides whether the plan-writing half of item 2 closes.

| Arm | Used the kit (both records) | Composed final | writing-plans skill-called | Plan written | Arm check |
|---|---|---|---|---|---|
| head, c89a2b7 | 10/10 | 9/10 | 10/10 | 10/10 | 10/10 |
| v612, 871cee9 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |

Every counted session was read from its post-check records. None needed
the plan-file fallback, and the records and plan files agree on every
session.

**Validity.** All 20 counted sessions carry the `skill-called` record and
wrote a plan, so both readings and the comparison stand.

**Arm check.** All 10 head sessions loaded writing-plans from
`.worktrees/plans-ui-baseline/skills/writing-plans` and carry the Grounding
instruction. All 10 v612 sessions loaded it from
`.worktrees/plans-ui-612/skills/writing-plans` and do not.

**Pilot.** `051507Z-9f61`, head. The instrument check passed: setup and
every pre-check passed, the size check and the 380-test suite among them;
the post phase held both kit records, the plan record and a `skill-called`
record; the Gauntlet-Agent wrote a result; and writing-plans loaded from
`plans-ui-baseline` with the Grounding instruction. By hand, the operator
sent the brief exactly in one turn and mentioned none of the kit, the
template, reuse or the Services page, and the session wrote a plan. The
hold condition did not fire: the pilot's full listing came back as a
persisted-output preview, not in full. Reported with no reading: before the
plan, a tool result was moved to a file (calls 2 and 3), the session did
not read either file, `vendor/kit` was first named in call 4, and the
session used the kit.

**Readouts, with no reading attached.** From `tally.txt`, head first and
v612 second:
- Plan code calls each of `dataTable(`, `selectField(`, `filterBar(`,
  `badge(`, `emptyState(` and `pageHeader(`: 10 of 10 in both arms.
  `card(`: 0 of 10 in both.
- Plan code writes `<table`: 10 of 10 in both, none outside assertions.
  `<select`: 6 of 10 and 5 of 10, none outside assertions.
- Plan code using the pill classes: 0 of 10 in both. `escapeHtml`: 2 of 10
  in both; by hand, each call escapes a formatted value inside a
  `dataTable` column's `render` callback.
- Plans naming `vendor/kit` or `#kit/`, plans naming the kit's table, and
  plans naming `services.js`: 10 of 10 in both.
- Grounding sections: all 10 head plans cite both the kit and
  `services.js`; no v612 plan has one. `**Mirror:**` lines: all 10 head
  plans cite `services.js`, 3 of them other files too; no v612 plan has
  one. This is the version difference showing up in the plan text; it did
  not change the count.
- Sessions that read the README, `package.json` and `services.js`: 10 of
  10 in both. Sessions that read a kit file: 0 of 10 and 2 of 10, the
  kit's table or select 0 and 1. That is an undercount: `tally.py` expands
  globs but not shell loops or a `cd vendor/kit` before the `cat`, and by
  hand all 20 read the kit's table and select before writing.
- Before the first plan write, a tool result showed `dataTable` or
  `selectField` and named `vendor/kit`: 10 of 10 in both.
- New here, all before the first plan write:
  - a tool result was moved to a file: 7 of 10 and 5 of 10; a tool call
    named such a file: 1 of 10 (`35d8`) and 0 of 10;
  - a tool call's input or result named `vendor/kit`: 10 of 10 in both,
    first by Bash in all 20 and by a persisted file in none. Head: call 2
    in 2 sessions, call 3 in 3, call 4 in 5. v612: call 2 in 6, call 4 in
    4;
  - a tool result showed `#kit/`: 10 of 10 in both, none before
    `vendor/kit` was named.
- Skill calls: `hyperpowers:writing-plans` 10 in each arm. No
  `AskUserQuestion`, no Agent dispatch, no auto compaction in either.
- No session in either arm left a change in source, test, data, public,
  vendored, pipeline, tool or script files or `package.json`. One composed
  final failed, `0ff2` (head); see below.
- Every counted session ran Claude Code 2.1.287 on `claude-opus-5-5`
  alone.

**The failed composed final.** `053123Z-0ff2`, head, failed the
Gauntlet-Agent's criterion 4, which forbids creating or changing any source
or test file; criteria 1 to 3 passed. Before writing its plan, the session
built the page in its real workdir to check the plan's code:
- it wrote `src/pages/deploys.js` and `test/pages/deploys.test.js`, and
  their 9 tests passed (call 9);
- it copied `src/server.js` and `src/layout.js` to `/tmp/dp`, added the
  route and the nav link to both with `sed -i`, and ran the suite, in which
  two end-to-end tests failed (call 10);
- it added `deploys.json` end-to-end fixtures, and the suite passed 389 of
  389 (call 11);
- it reverted with `git checkout src/server.js src/layout.js` and `rm -f`
  of the new files (call 12), and wrote the plan in call 13 of 17.

The tree ended clean, so the deterministic no-implementation check passed
and the session counts as using the kit. It did not begin executing after
the plan. Its final message says "I haven't implemented anything, as you
asked", and in the same message that it checked the plan's code by running
it in the tree and then removed the prototype. The grader judged that this
broke "Don't start implementing yet", and flagged the copies left in
`/tmp/dp`. The two other sessions that ran plan code before writing the
plan did so outside the workdir, `a88d` in a copy and `ccd7` with a script
in `/tmp` (`handread.md`).

**By hand** (`handread.md`).
- **Classes.** None: every session in both arms used the kit.
- **How the kit was found.** Every session found it by call 4, none by
  reading a persisted file, following a page's import, or searching. Ten
  sessions and the pilot found it through a `git ls-files` with
  `pipeline/` filtered out, and `data/` too in all but `35d8` (f2). Five
  found it in `package.json`'s imports map, read after a listing cut with
  `head`, in call 2 or, in `5ecf` and `2253`, call 3 (f5). Five, all v612,
  found it in the visible tail of a cut-short error result (f5, below).
  Each of the ten f5 sessions listed the kit by component within the next
  two calls.
- **Read.** All 20 read the README, `package.json`, `services.js` and the
  source of the kit's table and select before the first plan write.
- **Grounding and Mirror.** As in the hard campaign, every head plan's
  page-module Mirror line cites the top of `services.js` (the header
  comment, the constants and the query parsing), not its markup at lines
  23-96, and four say not to take its markup. No v612 plan has Grounding
  or Mirror content.
- **Services.** 16 of 20 plans tell the implementer, naming the Services
  page, not to copy its markup, 8 in each arm. The other four say not to
  hand-write the markup without naming the page. Four plans call the page
  older or say it predates the kit.
- **Operator and execution.** No session asked the operator anything, and
  none began executing after writing the plan. In `806c` the operator
  declined one command after the plan, an `rm -rf` of the session's own
  `mktemp` directory chained with the Codex preflight, and said so in a
  second message.
- **Raw markup.** No plan writes its own table or select.
- **Not pre-registered.** Every counted session and the pilot ran its plan
  code before handing the plan over, 3 before writing it (`0ff2`, `a88d`,
  `ccd7`) and 17 after. Every session found codex-plugin-cc not installed
  at the plan-review gate and logged the skipped gate to the ungated
  ledger, `8f39` one call before its plan write and the rest after.

**What the size did.** The campaign assumed that a full listing would be
moved to a file and that its 2KB preview would end before the kit. At
2.1.287 no session saw a full listing in full, but that hid the kit from
one call, not from the session:
- 16 of 20 counted sessions (head 7, v612 9) and the pilot ran a full
  `git ls-files` in call 2, in the same command as a `cat` of the spec.
  Eleven of those results, and the pilot's, were moved to a file. Their
  preview was the opening of the spec, not the listing, so the
  `pipeline/` cut-off this README predicted never showed. No session read
  a moved file to find the kit. One (`35d8`) read part of it, lines 60 to
  400, which stop before `vendor/`.
- The other five, all v612, were cut short instead, because a later
  command in the same call failed. Claude Code does not move a failed
  command's output to a file. It keeps about the first 30,000 characters
  and shows the first and last 5,000 or so, with the count cut between
  them. `vendor/` sorts last, so the visible tail was 105 lines of kit
  files, `accordion` to `dropdown-menu`. That tail is where those five
  first saw `vendor/kit`. The split between arms comes from how the
  commands were composed (a trailing `ls` of a missing directory or a `cat`
  of missing files), and carries no reading.
- Whatever call 2 showed, every session then ran a listing short enough to
  show in full: `git ls-files` with `pipeline/` filtered out, a
  path-limited `git ls-files`, or `ls vendor/kit`. By what call 2 showed:
  eleven sessions and the pilot ran it after call 2 was moved to a file,
  five after call 2 was cut short, and four (`0ff2`, `5bc8`, `9357`,
  `a88d`) after a call 2 whose listing was cut with `head`.

**Grader.** All five row logs record `gauntlet_agent_model=claude-opus-5-5`.
Each archived `result.json` records `config.model` as `claude-opus-5-5`, in
all 20 counted runs and the pilot.

**Host state outside the run directory.** Nine counted sessions wrote fixed
paths in the host's `/tmp`; the other eleven and the pilot used only
`mktemp`.
- Removed by the session that made them:
  - `/tmp/deploys-plan-dryrun` (`d42f`), a `git worktree add` of its own
    workdir, removed in call 25;
  - `/tmp/harbor-dry` (`a88d`), a scratch copy, with `rm -rf` before the
    copy and at the end of the same call;
  - `/tmp/servertests.js` (`d25c`);
  - `/tmp/blk<n>.js` and `/tmp/json<n>.json` (`2253`), `/tmp/blk<n>`
    (`9357`), and `/tmp/blk.txt` and `/tmp/blk<n>.txt` (`e38d`), extracted
    plan code blocks. The three ran at different times (05:29Z, 05:56Z and
    06:08Z), wrote different file names, and each removed its own, so none
    read another's files.
- Left on the host: `/tmp/dp` with copies of `src/server.js` and
  `src/layout.js` (`0ff2`), `/tmp/out.txt` (`940f`) and
  `/tmp/deploys-check.mjs` (`ccd7`), with `/tmp/newtests.js` from the hard
  campaign.
- No worktree file changed (see the mutation checks).

**Runs.** All times are 2026-10-03 UTC.
- **Pilot:** the stamp was written at 05:14:53Z, the row launched at
  05:15:07Z, and it finished at 05:21:36Z. `trials: P`.
- **Batch:** 4 rows of `--repeat 5`, 20 sessions, 2 concurrent. The stamp
  was written at 05:25:51Z.
  - Head `p1` and v612 `p1` launched at 05:26:08Z.
  - Head `p2` launched at 05:52:55Z, when head `p1` finished. v612 `p2`
    launched at 05:55:55Z, when v612 `p1` finished.
  - Head `p2` finished at 06:22:49Z, and v612 `p2`, the last row, at
    06:27:34Z.
  - Head `p1`'s `trials:` line reads `PFPPP`; the `F` is `0ff2`'s composed
    final. The other three read `PPPPP`. All four row logs record
    `claude_version_after=2.1.287`.
- There were no grader voids, setup voids, version voids or indeterminates,
  in the pilot or the batch. No replacement rows ran, and
  `superseded.txt` was not written. No arm landed at 7 or 8 of 10, so
  `manifest-extend.tsv` was not written.
- The mutation checks passed at all five points in
  `logs/mutation-checks.txt`, for both worktrees: before and after the
  pilot, before the batch, after the counted sessions and after archiving.
  No file outside `.git` was newer than its stamp, `HEAD` stayed at
  c89a2b7 and 871cee9, and `git status --short` stayed empty.
- `tally.txt` is `tally.py` over the archives.

**What this does not show.** The Limits above stand. Concretely:
- **Why the field failed.** With all four field cues at the field's size,
  both versions found and used the kit every time. The size hid the kit
  from a full listing, and every session ran a narrower one within two
  calls. Size, the candidate the hard campaign pointed at, is tested and
  ruled out on this fixture. The three the consequence names are
  untouched: framework components in place of plain functions, a long
  session that has already planned earlier pages, and a brainstormed spec
  that describes the page to copy in detail.
- **Whether Grounding helps.** Both arms are at the ceiling, so this says
  nothing about Grounding either way. The head's plans cite the Services
  page in their Mirror lines and still take no markup from it.
- **Which cue matters.** Nothing reproduced, so the stacked design says
  nothing about any single cue.
- **The persisted-output preview.** Sessions combined the listing with the
  spec, so the preview showed the spec, and the predicted `pipeline/`
  cut-off was never what a session saw. The reading does not rest on it:
  whatever call 2 showed, every session ran a narrower listing and had
  named `vendor/kit` by call 4.
- **Scope of the artifact.** Plain functions, not Angular components. Plans
  only, not implementation or review.
- **Power.** 10 of 10 excludes kit-use rates below 74% per arm. At a rate
  of 0.8, 10 of 10 would still occur with probability 0.11. The
  not-separated comparison is not evidence that the versions behave alike.
- **Scope.** One scenario, one model, one Claude Code version, one fixture.
