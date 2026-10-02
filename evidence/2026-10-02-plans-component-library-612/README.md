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

Pending.
