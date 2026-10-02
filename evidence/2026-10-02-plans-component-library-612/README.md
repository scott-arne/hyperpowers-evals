# Writing-Plans and an Existing Component Library: the 6.12.0 Arm (2026-10-02)

Pre-registered before the first session, pilot included. The rules below were
fixed and committed before any run launched; results are appended under
Results.

## Question

The baseline (`../2026-10-02-plans-component-library-baseline/`, results in
evals 65d388da1) ran `writing-plans-reuses-component-library` at the release
head c89a2b7. All 10 plans built the Deploys page's table and filter from the
component library. That reading cannot tell two explanations apart:
- **Grounding fixed it.** The field sessions behind BACKLOG item 2 loaded
  writing-plans from 6.2.1, 6.6.1, 6.9.2 and 6.12.0, and from no later
  version. None of those has a Grounding section. The release head sends the
  writer to find one real example of each convention it will touch.
- **The fixture is too easy.** Harbor is small enough to read whole, its
  README names `src/ui/` as the component library, and one page already uses
  it. Every baseline session read all of it before writing. Any version
  might build the page from the library here.

The question: on the same scenario, at the same pins, how often does a plan
written by hyperpowers 6.12.0 build the page's table and filter from the
library, and does that count separate from the release head's 10 of 10?

## Change

None to any skill. The arms differ by the whole version: 312 commits from
v6.12.0 (871cee9) to c89a2b7. In writing-plans, `SKILL.md` changes by 37
lines. The head adds:
- the Grounding paragraph ("Ground the plan before you write it") and the
  `## Grounding` template section;
- the `**Mirror:**` line;
- the sanctioned `Unknown:` and `Assumption:` entries, with a citation that
  does not resolve counting as a plan failure;
- self-review item 4, "Grounding is real";
- the handoff's "one task reviewer".

The head also removes `plan-document-reviewer-prompt.md`. Outside the skill,
the session-start hook differs: the head appends one-line notices to the
injected context, among them a plugin-version staleness notice. A
separation therefore attributes the difference to the version, not to
Grounding alone (see Limits).

## Scenario

Unchanged from the baseline, at the same harness pin (commit 2dbae1fee): the
Harbor fixture, the written spec, the brief sent exactly, the operator who
never cues the library, the same pre- and post-checks, and the same graded
criteria. The baseline README's Scenario section describes it.

The scenario does not depend on the version. Both versions save plans under
`docs/hyperpowers/plans/`, which the post-checks' `docs/*/plans/*.md` covers,
and the `skill-called` detector matches the `hyperpowers:` namespace.

## Arms

- **v612 (pilot and counted):** hyperpowers v6.12.0, 871cee9, worktree
  `.worktrees/plans-ui-612`. It is the installed plugin version and the
  newest version the field sessions loaded.
- **head (counted):** hyperpowers c89a2b7, worktree
  `.worktrees/plans-ui-baseline`. Its counted sessions are the baseline's 10,
  read from that campaign's logs and archives; the baseline's pilot is not
  counted. Head sessions run in this campaign only in an extension (see
  Decision Rules).

## Pins

In `manifest.tsv` (the batch) and `manifest-pilot.tsv` (the pilot):
- harness 2dbae1fee, the baseline's pin (evidence commits may follow it;
  harness paths may not);
- v612 871cee9; head c89a2b7, the baseline's pin;
- model `claude-opus-5-5` via `claude-auto`.

**Grader:** the Gauntlet-Agent on `claude-opus-5-5`, as in the baseline.
`logs/measure-launch.sh` refuses to launch unless `GAUNTLET_AGENT_MODEL` is
`claude-opus-5-5`, and records it in each row log.

**Budget** `default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and
`INTERLOCK_PROBE_TRACE` unset. `ANTHROPIC_DEFAULT_OPUS_MODEL` is unset; each
row log records it.

**Claude Code 2.1.287**, as in the baseline:
- `logs/measure-launch.sh` refuses to launch unless `claude --version` is
  2.1.287, and logs the version before and after each row;
- `tally.py` voids any session whose transcript records a version other than
  2.1.287 alone (see Void Attempts).

**Host instruction files.** Sessions do not load the host `CLAUDE.md` files
above the run directory (since evals 74d2482).

Checked before this file was committed:
- `claude --version` prints 2.1.287;
- `.worktrees/plans-ui-612` is at 871cee9 with a clean tree;
- the evals harness paths are clean and identical to 2dbae1fee;
- `GAUNTLET_AGENT_MODEL` is `claude-opus-5-5` in the host shell;
  `ANTHROPIC_MODEL` is unset there, so it is set to `claude-opus-5-5` on the
  launch command itself.

`logs/measure-launch.sh` repeats all four on every row, for the arm the row
names.

## Pilot

One v612 session from `manifest-pilot.tsv` (`launch-all.sh manifest-pilot.tsv
1`, proc `p0`), launched alone before the batch. It runs the same arm as the
batch, and nothing changes between them unless the instrument check fails.
The main risk is the 6.12.0 plugin itself: whether quorum provisions it and
its session-start hook runs under Claude Code 2.1.287.

**Instrument check.** The pilot passes when all five hold:
- setup and every pre-check pass;
- the post phase holds both library records, the plan record and a
  `skill-called` record;
- the Gauntlet-Agent wrote a result;
- the arm check: the session loaded writing-plans from
  `.worktrees/plans-ui-612/skills/writing-plans`, and the Grounding
  instruction ("Ground the plan before you write it") appears nowhere in it;
- by hand: the operator sent the brief exactly, gave no cue about how to
  build the page, and the session reached a plan or a refusal.

Whether the pilot used the library is reported with no reading, and it does
not gate the batch. A failed instrument check means the scenario or the
launcher is fixed, this README is amended in a commit before the batch (the
harness pin moves with it, and the baseline's head count no longer applies
unless the harness change cannot reach a head session), and the pilot runs
again. A void attempt is relaunched under the void rules as `r0`.

## Size

2 v612 manifest rows, each one `quorum run --repeat 5` process: 10 sessions,
2 concurrent.

## Decision Rules

**Primary measure.** As in the baseline: a session counts as using the
library when both of its deterministic post-checks on the plan's fenced code
pass, the one that finds `dataTable(` and the one that finds `selectField(`.
A counted session missing either record is read from its plan files with the
same rule (fenced lines only, the fence state reset per file) and named in
Results. A session that wrote no plan counts as not using the library and is
named.

**Comparison.** The head's count is fixed at the baseline's 10 of 10.

| v612, used the library | Reading |
|---|---|
| 6 or fewer of 10 | separated: 6.12.0 reproduces the failure on this fixture, and the release head does not |
| 7 or 8 of 10 | both arms extended once to n=20 |
| 9 or 10 of 10 | not separated: the fixture cannot tell the versions apart |
| 18 or more of 20 | not separated |
| fewer than 18 of 20, one-sided Fisher p below 0.05 | separated |
| otherwise | weak: the human partner decides |

The Fisher p is one-sided, head above v612, over the two arms' counts. If the
head's count at n=10 is not 10 of 10 (it is, unless a baseline run is later
voided), no reading is taken and the human partner decides.

**Extension.** `manifest-extend.tsv`, four rows with the same pins, in this
order: v612 `p3`, head `p3`, v612 `p4`, head `p4`. At 2 concurrent, each
pair runs one row of each arm in the same window. The head rows run on
`.worktrees/plans-ui-baseline` at c89a2b7 and are logged here as `head-*`.
It is written and committed before it launches.

**Why these edges.** Against the head's 10 of 10, 6 of 10 separates
(one-sided Fisher p 0.043) and 7 of 10 does not (p 0.105). At n=20, with
the head at 20 of 20, 15 of 20 separates (p 0.024) and 16 or 17 of 20 does
not (p 0.053, 0.115). 18 of 20 or more is within what a single fixture can
call the same. These are the baseline's bands, read now as a comparison.

**What the table can tell apart.** If 6.12.0 uses the library in a fraction
r of such sessions, and the head's extension rows (if any) again use it in
all 10, the probability of each reading is:

| r | separated | weak | not separated |
|---|---|---|---|
| 0.3 | 1.00 | 0.00 | 0.00 |
| 0.5 | 0.99 | 0.00 | 0.01 |
| 0.6 | 0.92 | 0.03 | 0.05 |
| 0.7 | 0.72 | 0.12 | 0.16 |
| 0.8 | 0.34 | 0.25 | 0.41 |
| 0.9 | 0.04 | 0.15 | 0.80 |
| 0.95 | 0.00 | 0.04 | 0.96 |

Rates near 0.8 are not reliably classified either way.

**Validity.** Per arm, as in the baseline: two records are checked, the
post-check `skill-called` record and whether a plan exists. These sessions
stay counted and are named in Results. If more than a fifth of an arm's
counted sessions are like this (3 or more of 10, 5 or more of 20), no reading
is taken and the human partner decides. If the v612 sessions with no plan
decide the reading, Results says so.

**Arm check.** A counted session that loaded writing-plans must have loaded
it from its arm's worktree (`plans-ui-612` for v612, `plans-ui-baseline` for
head), and its transcript must carry the Grounding instruction for head and
not for v612. One counted session failing it means no reading is taken; the
human partner decides.

**The composed final is a readout, not a guard.** As in the baseline. Every
counted v612 session whose composed final did not pass is read by hand,
naming the criterion it failed.

**Consequence.**
- **Separated:** on this fixture, 6.12.0 reproduces the field failure and
  the release head does not. No skill change comes from this campaign. The
  installed plugin is 6.12.0, so the fix reaches the field only when the
  release ships. Attributing it to Grounding, not to the rest of the version
  difference, would need an ablation arm (c89a2b7 without the Grounding
  text); the human partner decides whether that is worth running.
- **Not separated:** 6.12.0 also builds the page from the library, so this
  fixture cannot reproduce the field failure, and the baseline's 10 of 10
  says nothing about whether Grounding helps. No skill change comes from
  this campaign. The human partner decides whether a harder fixture is
  worth building or whether the plan-writing part of item 2 closes.
- **Weak or no reading:** the human partner's call.

**Hand-read.** Every counted v612 session is read by hand, with the
baseline's classes for each session that did not use the library:
- (a) copied the Services page's pattern: its own `<table>` and `<select>`
  markup, its own chip classes;
- (b) used some library parts (for example `statusChip` or `pageHeader`),
  but not the table or the select;
- (c) other, described.

Each such session also records whether the plan mentions `src/ui/`, and
whether it gives a reason for not using it.

Every v612 session records:
- whether its plan has a Grounding section or `**Mirror:**` lines anyway,
  and what they cite;
- whether it read `src/ui/` files, the Services page, and the README;
- whether it asked the operator about the library or the Services page;
- whether it began executing the plan after writing it.

Extension head sessions, if any, are read like the baseline's. The
deterministic count governs the reading; the hand-read explains it.

**Readouts, with no reading attached.** From `tally.py`, per arm:
- the one-sided Fisher p, head above v612;
- sessions where the records and the plan files disagree;
- plan code calling each of `dataTable(`, `selectField(`, `statusChip(`,
  `emptyState(` and `filterBar(`;
- plan code writing its own `<table` or `<select` markup;
- plans naming `src/ui` or `services.js` anywhere;
- what the Grounding sections cite (`src/ui`, `services.js`, both, neither,
  or no Grounding section), and plans with a `**Mirror:**` line;
- sessions that read a `src/ui/` file or `services.js`, counting a Bash
  command whose `src/` glob expands to the file (the baseline's tally did
  not expand globs, and found `services.js` read in 7 of 10 where the
  hand-read found 10);
- Skill calls; sessions and calls using `AskUserQuestion`; sessions
  dispatching an Agent;
- sessions that changed source, test, data or public files;
- sessions with an auto compaction (none expected);
- sessions whose composed final did not pass.

## Void Attempts

Copied from the baseline, which follows the evals void-attempt rule:

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
listed in `superseded.txt`; `tally.py` reads it and the baseline's.

## Mutation Checks

Each window has an epoch stamp, written immediately before launch:
- `logs/pilot-window-start.txt` for the pilot;
- `logs/batch-window-start.txt` for the batch;
- `logs/extend-window-start.txt` for an extension.

`.worktrees/plans-ui-612` is checked before the pilot, after the pilot,
before the batch, after the counted sessions, and after archiving.
`.worktrees/plans-ui-baseline` is checked too if an extension runs: before
it, after it, and after archiving.

Each check:
- `find` over the worktree outside `.git` reports no file newer than the
  stamp;
- the worktree's `HEAD` equals its pin;
- `git status --short` is empty.

## Limits

- **The whole version differs.** The arms differ by 312 commits, not by
  Grounding alone. Within writing-plans the Grounding text is most of the
  change, but the `**Mirror:**` line, the citation rule, the removed
  reviewer prompt and the session-start notices differ too. A separation
  says the version matters on this fixture, not which change does.
- **Different windows.** The head's 10 sessions ran in the baseline's
  window, earlier on the same day, at the same pins. Only an extension runs
  both arms side by side.
- **The fixture is easier than the field.** As in the baseline. If 6.12.0
  also builds the page from the library here, the fixture is too easy to
  test the fix, and the field failure stays unexplained by this scenario.
- **One field version.** The field sessions also ran 6.2.1, 6.6.1 and
  6.9.2. Only 6.12.0 runs here.
- **Scope of the artifact.** Plain functions, not Angular components. Plans
  only, not implementation or review.
- **Power.** The table does not reliably classify a 6.12.0 library-use rate
  near 0.8 (see Decision Rules).
- **Scope.** One scenario, one model, one Claude Code version, one fixture.

## Files

- `manifest.tsv` and `manifest-pilot.tsv`, and `manifest-extend.tsv` if an
  extension runs.
- `launch-all.sh`, copied from the baseline with one change: the arm names
  are v612 and head.
- `logs/measure-launch.sh`, adapted from the baseline's: the evidence
  directory and the two arms.
- `archive-runs.sh`, adapted from the baseline's: the evidence directory and
  the two arms, and it drops the npx `node_modules` and headless Chrome
  profiles that the baseline removed by hand.
- `logs/`: one log per row with the pins, the command, and quorum's `trials:`
  output, plus the window stamps, `launch-all.out` and `mutation-checks.txt`.
  Replacements and re-runs under the void rules are logged as `r<n>`.
- `runs/v612/<run-id>/` and, if an extension runs, `runs/head/<run-id>/`:
  the run archives, stripped per `../README.md`. The baseline's head runs
  stay under `../2026-10-02-plans-component-library-baseline/runs/control/`.
- `tally.py` and its output `tally.txt`: the decision rules over both
  campaigns' archives.
- `handread.md`: the hand-reads named above.

## Results

**Not separated.** On 6.12.0, every counted session built the Deploys
page's table and filter from the library: all 10 plans call both
`dataTable(` and `selectField(` in their fenced code, the same as the
release head's 10 of 10. The one-sided Fisher p is 1.0. That is the "not
separated" band, and 10 of 10 excludes 6.12.0 library-use rates below 74%
(one-sided 95%). Per the pre-registered consequence, this fixture cannot
reproduce the field failure, and the baseline's 10 of 10 says nothing about
whether Grounding helps. No skill change comes from this campaign. The
human partner decides whether a harder fixture is worth building or whether
the plan-writing part of BACKLOG item 2 closes.

| Arm | Used the library (both records) | Composed final | writing-plans skill-called | Plan written | Arm check |
|---|---|---|---|---|---|
| v612, 871cee9 (this campaign) | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |
| head, c89a2b7 (baseline window) | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 |

No extension: the v612 count was not 7 or 8 of 10, so `manifest-extend.tsv`
was not written and no head session ran here. Every v612 session was read
from its post-check records, none needed the plan-file fallback, and the
records and plan files agree on every session.

**Validity.** All 10 v612 sessions carry the `skill-called` record and
wrote a plan, so the reading stands.

**Arm check.** All 10 v612 sessions loaded writing-plans from
`.worktrees/plans-ui-612/skills/writing-plans`, and none carries the
Grounding instruction. `tally.py` reran the check over the baseline's 10
head sessions: each loaded writing-plans from `plans-ui-baseline` and
carries the instruction.

**Pilot.** `221024Z-386a`. The instrument check passed: setup and every
pre-check passed, the post phase held both library records, the plan record
and a `skill-called` record, and the Gauntlet-Agent wrote a result. The arm
check passed: writing-plans loaded from `plans-ui-612`, with no Grounding
instruction. By hand, the operator sent the brief exactly in one turn with
no cue, and the session wrote a plan. It used the library; that carries no
reading.

**Readouts, with no reading attached.** From `tally.txt`, v612 first and
head second:
- Plan code calls each of `dataTable(`, `selectField(`, `statusChip(`,
  `emptyState(` and `filterBar(`: 10 of 10 in both arms.
- Plan code writes `<table`: 10 of 10 in both. `<select`: 10 of 10 and 6 of
  10. By hand, every one of those lines is a test assertion, not page code
  (below).
- Plans naming `src/ui` and `services.js`: 10 of 10 in both.
- Grounding sections: none in v612; in the head, all 10 cite both `src/ui`
  and `services.js`. `**Mirror:**` lines: 0 of 10 and 10 of 10. This is the
  version difference showing up in the plan text, as expected; it did not
  change the count.
- Sessions that read a `src/ui/` file: 10 of 10 in both. Sessions that read
  `services.js`, now counting a `src/` glob that expands to it: 10 of 10 in
  both, which matches the baseline's hand count.
- Skill calls: `hyperpowers:writing-plans` 10 in each arm. No
  `AskUserQuestion`, no Agent dispatch, no auto compaction in either.
- No session in either arm changed source, test, data or public files. No
  composed final failed, so no failure hand-read was needed.
- Every counted v612 session ran Claude Code 2.1.287 on `claude-opus-5-5`
  alone.

**By hand** (`handread.md`).
- **Classes.** None: every v612 session used the library.
- **Read.** All 10 read the README, every `src/ui/` file and both pages in
  one call, before writing, the same reading pattern as the head.
- **Grounding and Mirror.** No v612 plan has a Grounding section, a
  `**Mirror:**` line or a `file:line` citation of a page or library file.
  Each instead lists the library components under Task 1's `Consumes:`
  slot, "from `src/ui/index.js`". That slot is in both versions' templates,
  and the head's plans fill it the same way.
- **The model page.** Three of 10 v612 plans name `overview.js` as the page
  the new one follows (`6c13`, `ee38`, `753e`); the head's page-module
  Mirror is `overview.js` in 10 of 10. Three v612 plans add a table mapping
  each spec need to a library component.
- **Services.** All 10 v612 plans tell the implementer not to copy
  `services.js` because it predates the library, as all 10 head plans do.
  Without Grounding, the plans still name the split.
- **Operator and execution.** No session asked the operator anything, and
  none began executing.
- **Raw markup.** Every v612 plan's two raw-markup lines are test
  assertions: the library's own `ui-select` output, copied from the
  fixture's `test/ui/select.test.js`, and `doesNotMatch(html, /<table/)` in
  the empty-state test.
- **What led there.** No session names a cue. The README, the Overview page
  and the library arrive in the same read. No plan cites the README.
- **Not pre-registered.** Every counted session ran its plan code in a
  `mktemp -d` scratch copy and ran the tests before handing the plan over,
  as every head session did. Every session found codex-plugin-cc not
  installed at 6.12.0's plan-review gate, and nine logged the skipped gate.

**Grader.** All three row logs record `gauntlet_agent_model=claude-opus-5-5`.
Each archived `result.json` records `config.model` as `claude-opus-5-5`, in
all 10 counted runs and the pilot.

**Host state outside the run directory.** No counted session wrote outside
its run directory except through `mktemp`. The pilot wrote
`/tmp/harbor-scratch`, `/tmp/d.js`, `/tmp/deploys.js` and
`/tmp/deploys.test.js` in the host's `/tmp`. It moved `/tmp/d.js` into its
scratch copy; the other three were still there after the batch. The pilot
ran alone, so no counted session shared them. No worktree file changed (see
the mutation checks).

**Runs.**
- **Pilot:** the stamp was written at 22:10:16Z, the row launched at
  22:10:24Z, and it finished at 22:14:49Z. `trials: P`.
- **Batch:** 2 rows of `--repeat 5`, 10 sessions, 2 concurrent. The stamp
  was written at 22:15:13Z, both rows launched at 22:15:19Z, and the last
  row finished at 22:40:45Z. Both rows' `trials:` lines read `PPPPP`, and
  both row logs record `claude_version_after=2.1.287`.
- There were no grader voids, setup voids, version voids or indeterminates,
  in the pilot or the batch, so no replacement rows ran and
  `superseded.txt` was not written.
- The mutation checks passed at all five points in
  `logs/mutation-checks.txt`: before and after the pilot, before the batch,
  after the counted sessions and after archiving. No file in
  `.worktrees/plans-ui-612` outside `.git` was newer than its stamp, `HEAD`
  stayed at 871cee9, and `git status --short` stayed empty. No extension
  ran, so `.worktrees/plans-ui-baseline` was not checked.
- `tally.txt` is `tally.py` over both campaigns' archives.

**What this does not show.** The Limits above stand. Concretely:
- **Why the field failed.** On this fixture, 6.12.0's writing-plans finds
  and uses the library every time. The field failure is not explained by
  the 6.12.0 skill text alone on a small repository. What separates the
  field from this fixture is untested: the field's Angular template is
  larger, with its library spread across modules, and Harbor's library
  arrives in the first read.
- **Whether Grounding helps.** Both versions are at the ceiling here, so
  this says nothing about Grounding either way. Telling them apart needs a
  fixture where 6.12.0 fails.
- **Other field versions.** The field sessions also ran 6.2.1, 6.6.1 and
  6.9.2. Only 6.12.0 ran here.
- **Different windows.** The head's 10 sessions ran in the baseline's
  window, starting at 20:58Z, about 75 minutes before this batch, at the
  same pins. No extension ran, so no head session ran alongside v612.
- **Scope of the artifact.** Plain functions, not Angular components. Plans
  only, not implementation or review.
- **Power.** 10 of 10 excludes 6.12.0 library-use rates below 74%. At a
  rate of 0.8, 10 of 10 would still occur with probability 0.11.
- **Scope.** One scenario, one model, one Claude Code version, one fixture.
