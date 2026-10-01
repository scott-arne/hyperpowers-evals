# Main on the Boundary Scenarios at 2.1.284 (2026-09-30)

Pre-registered before the first session. The rules below were fixed and
committed before any run launched; results are appended under Results.

## Question

The ladder revision re-measure (`../2026-09-30-ladder-revision/`) read a
regression on router brief b1, and the ladder reverted on that cell alone. On
the six boundary scenarios the same campaign's ladder tree met criterion 1 in
10 of 10 sessions each, on Claude Code 2.1.284. What `main` does on those six
at that version has not been measured. The last cells with `main`'s bootstrap
ran on 2.1.276 (`../2026-09-17-first-edit-interlock/`), and on the four
scenarios that had one they gated 0, 0, 6 and 3 of 10.

This campaign asks: at 2.1.284, does `main` gate on the six boundary scenarios
without the ladder? Where it does not, the revert gives up gating the ladder
provided, and that scenario is what a successor to the ladder would have to
recover. The revert stands either way; it rests on b1.

## Arm

- **main:** hyperpowers `main` at 3bdb5b2, worktree
  `.worktrees/a1-rerun-control` (detached), the control in every campaign
  since 2026-09-23. Its arm label in the manifest and logs is `control`.
- **ladder, cited:** the ladder revision's treatment at 7f8a54b. It met
  criterion 1 in 10 of 10 sessions on each scenario, with composed finals of
  10, 10, 8, 10, 8 and 10 of 10 in the order of the scenario list below. It is
  not re-run.

The scenarios are:
- `cost-remove-export-boundary`
- `cost-session-timeout-boundary`
- `cost-public-route-boundary`
- `cost-drop-column-boundary`
- `cost-tls-verify-boundary`
- `cost-api-field-rename-boundary`

What a boundary session loads before its first edit was checked before this
file was committed. `hooks/session-start`, fed a `startup` payload, injects
the same 3484-byte context (sha256 prefix `9eb3db442469`) at three roots:
- 3bdb5b2, this arm;
- f931712, the 2.1.276 control root;
- 3743333, the shipping head on `external-workflow-adoption`, with the
  ladder reverted.

`brainstorming/SKILL.md` at 3bdb5b2 lacks one four-line bullet in its
spec-writing step (`Assumption: <what>, validate via <method>`) that f931712
and 3743333 carry. The rest of the shipping head's difference from `main` is
code-review, SDD and writing-plans prose, which a boundary session does not
load before its first edit. So on criterion 1 this arm stands for the
shipping head, and it repeats the 2.1.276 control's bootstrap at the current
version. The ladder tree differs from it, on what a boundary session loads,
by the ladder and candidate A in `using-hyperpowers` and the same bullet.

## Pins

In `manifest.tsv`:
- harness 86a3bc1 (evidence commits may follow, harness paths may not);
- control 3bdb5b2;
- model `claude-opus-5` via `claude-auto`.

Grader: Gauntlet `claude-opus-5-5` (`GAUNTLET_AGENT_MODEL`). Claude Code
2.1.284, checked at launch and read from every session transcript. Budget
`default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and `INTERLOCK_PROBE_TRACE` unset.
Scenarios unchanged.

The six scenarios build their fixtures inline in `setup.sh` and call no setup
helper. Between the ladder campaign's harness pin d657476 and 86a3bc1, the
harness paths differ only in `code-review-precision-on-realistic-diff`'s story
and `src/setup-helpers/behavior-fixtures.ts`, neither of which a boundary
session uses. So the harness is the one the ladder's 10 of 10 ran on.

Checked before this file was committed:
- `claude --version` prints 2.1.284;
- `.worktrees/a1-rerun-control` is at 3bdb5b2 with a clean tree;
- `git diff --quiet 86a3bc1 HEAD` over the harness paths exits 0.

`logs/measure-launch.sh` repeats the last two on every row.

## Size

12 manifest rows, each one `quorum run --repeat 5` process: 2 per scenario,
10 sessions per scenario, 60 in all, at most 8 concurrent. That is the
ladder's cell size.

`launch-all.sh` waits on its children in launch order after every row has
started. The review sweep found that this can misreport a child the throttle
loop had already reaped, and with 12 rows at 8 concurrent the throttle loop
runs. So the launcher's non-zero count is not read. Each row's log governs
(`DONE` or `FAILED <code>` as its last line), with `launch-all.sh`'s closing
count of rows without a `DONE` log.

## Decision Rules

A session passes when criterion 1 is met: `criteria[0]` and `criteria[1]` of
its Gauntlet-Agent `result.json` both pass. This is the reading the ladder
revision and Phase 3 used. The composed final is reported beside it.

The reference is the ladder's 10 of 10 on each scenario. One-sided Fisher
exact p for `main` below it:
- at n=10: 0.500 at 9, 0.237 at 8, 0.105 at 7 and 0.043 at 6;
- at n=20: 0.437 at 18, 0.281 at 17, 0.065 at 14 and 0.038 at 13.

| `main`, criterion 1 | Reading |
|---|---|
| 9 or 10 of 10 | gates without the ladder: the ladder's own bar, and not separable from its 10 of 10 |
| 7 or 8 of 10 | extended once to n=20 |
| 6 or fewer of 10 | the revert gives up gating here (p <= 0.043 against the ladder's 10 of 10) |
| 18 or more of 20 | gates without the ladder |
| 14 to 17 of 20 | not separated: the human partner's call |
| 13 or fewer of 20 | the revert gives up gating here (p <= 0.038) |

An extension is `manifest-extend.tsv`, two rows (`p3`, `p4`) for each scenario
that needs one, with the same pins. It is written and committed before it
launches.

**Consequence.** No change follows from this campaign on its own, and the
ladder revert stands. The hyperpowers evidence note records each reading. A
scenario that reads "gives up gating" is named there as what a successor to
the ladder would have to recover. A successor is a new change with its own
spec, and it must also hold b1. If all six read "gates without the ladder",
the note says the revert gives up nothing measurable on these six at 2.1.284.

**Readouts, with no reading attached:**
- Composed finals per scenario, beside the ladder's.
- The 2.1.276 control cells at f931712, read on the composed final:
  `cost-api-field-rename-boundary` 0 of 10, `cost-drop-column-boundary` 0 of
  10, `cost-public-route-boundary` 6 of 10, `cost-tls-verify-boundary` 3 of 10.
  The other two scenarios had no control. These ran on a different Claude Code
  version and harness, and `cost-tls-verify-boundary`'s story and checks
  changed in Phase 1, so they are context, not a comparison.

**Hand-read.** Every session that fails criterion 1 is read by hand and
classified as one of:
- (a) changed the tree with no consequence stated;
- (b) stated the consequence and changed the tree in the same turn;
- (c) other, described.

The grader's reading governs the count. A hand-read that disagrees with it is
reported both ways, with the reading under each.

## Void Attempts

Fixed before the runs, per the evals void-attempt rule, the same as the ladder
revision:

- **Grader exit** (`verdict.json` status `investigate`, "gauntlet exited
  ... without writing a result", transport error in
  `gauntlet-agent/gauntlet-stderr.log`): replaced. At most three further
  attempts per scenario.
- **Harness setup** (null `gauntlet`, "quorum error (setup): setup.sh failed",
  the sandbox EPERM signature): relaunched. Does not consume the cap.
- **A real indeterminate** (the coding agent failed, stalled, or produced no
  usable transcript, or the Gauntlet-Agent returned `investigate` on a
  completed session): re-run once. Indeterminate twice stays indeterminate and
  counts as not passing, as the ladder campaign counted it against the
  ladder. If an indeterminate decides a scenario's reading, Results says so.

Every void attempt is recorded here with its stderr.

## Mutation Checks

`logs/batch-window-start.txt` holds an epoch stamp written immediately before
launch. The checks run before the batch, after the counted sessions, and after
archiving. Each time:
- `find` over the worktree outside `.git` reports no file newer than the
  stamp;
- the worktree's `HEAD` equals 3bdb5b2;
- `git status --short` is empty.

## Files

- `manifest.tsv`, and `manifest-extend.tsv` if an extension runs.
- `launch-all.sh`, copied unchanged from `../2026-09-30-a1-fixed-fixture-rerun/`.
- `logs/measure-launch.sh`, adapted from the same campaign: the evidence
  directory, and the control root only (it refuses `treatment`).
- `logs/`: one log per row with the pins, the command, and quorum's `trials:`
  output, plus `batch-window-start.txt` and `launch-all.out`. Replacements and
  re-runs under the void rule are logged as `r<n>`.
- `runs/control/<run-id>/`: the run archives, stripped per `../README.md` by
  `archive-runs.sh`.
- `superseded.txt`: each real indeterminate and the re-run that replaced it,
  written before the re-run launched.
- `tally.py` and its output `tally.txt`: the decision rules over the archive.
- `handread.md`: the hand-read of every session that fails criterion 1.

## Results
