# Ladder Router Brief b1 Re-measure (2026-09-30)

Pre-registered before the first session. The rule below was fixed and
committed before any run launched; results are appended under Results.

## Question

In the adoption-remediation Phase 3 campaign, router brief
`brainstorming-router-escalates-b1-userid-param` passed 1 of 3 on the
bootstrap-ladder tree. All three sessions invoked brainstorming; the two
failures classified the task bounded and wrote no spec. The only prior cell
for this brief is the interlock campaign's full arm at 3/3, also n=3. This
campaign asks whether the ladder lowers b1's pass rate or whether the Phase 3
miss was a small-sample draw.

Suspected mechanism, to be read from the transcripts, not scored: ladder rung
1 names "an interface others call (a route, a field name, a signature)", so
"Add a userId parameter to the login function" may be handled as a rung-1
confirm followed by a bounded classification.

## Arms

- **control:** hyperpowers `main` at 3bdb5b2, worktree
  `.worktrees/ladder-b1-control`.
- **treatment:** `external-workflow-adoption` at 10b1773 (after the A8-sentence
  and A10 reverts; skills tree e707321), worktree
  `.worktrees/ladder-b1-treatment`.

What differs for this brief: the `using-hyperpowers` body (the ladder), and
one bullet in brainstorming's spec-writing section (A6's `Assumption:` form),
which acts only after routing. The rest of the skills diff is SDD, code-review
and writing-plans prose that a routing session does not load, plus a YAML
quoting change to `optimizing-performance`'s description. Checked before
launch: each arm's `hooks/session-start`, fed a `startup` payload, injects a
context byte-identical to the other's once each arm's own `using-hyperpowers`
body is masked; the hook's other changes act on compaction or on control
bytes this content does not carry.

## Pins

In `manifest.tsv`: harness d657476 (evals HEAD at launch; evidence commits may
follow, harness paths may not), control 3bdb5b2, treatment 10b1773, model
`claude-opus-5` via `claude-auto`. Grader: Gauntlet `claude-opus-5-5`.
Claude Code 2.1.284. Budget `default`: `SLASH_COMMAND_TOOL_CHAR_BUDGET` and
`INTERLOCK_PROBE_TRACE` unset. Scenario unchanged.

## Size

8 manifest rows, each one `quorum run --repeat 5` process: 4 per arm, 20
sessions per arm, 40 in all, 8 concurrent.

## Decision Rule

A session passes when its composed final verdict is pass. The bar is
treatment at least 14 of 20. A regression is treatment below control with a
one-sided Fisher exact p < 0.05.

| Result | Reading |
|---|---|
| treatment >= 14/20 and no regression | b1 clears; the Phase 3 miss was a small-sample draw |
| regression | ladder rung 1 is revised or the ladder reverts; the human partner's call |
| both arms < 14/20, no regression | a brief or router issue, not the ladder's |
| treatment < 14/20, control >= 14/20, no regression | extend both arms to n=40 once, then the human partner's call |

Detectability: with control at 20/20 a regression needs treatment at 15 or
below; at 18/20, 12 or below; at 16/20, 10 or below. Differences of a few
sessions read as not separated, not as equal.

## Void Attempts

Fixed before the runs, per the evals void-attempt rule:

- **Grader exit** (`verdict.json` status `investigate`, "gauntlet exited
  ... without writing a result", transport error in
  `gauntlet-agent/gauntlet-stderr.log`): replaced, at most three further
  attempts per arm.
- **Harness setup** (null `gauntlet`, "quorum error (setup): setup.sh failed",
  the sandbox EPERM signature): relaunched; does not consume the cap.
- **A real indeterminate** (the coding agent failed, stalled, or produced no
  usable transcript): re-run once; indeterminate twice stays indeterminate and
  counts as not passing.

Every void attempt is recorded here with its stderr.

## Files

- `manifest.tsv`, `launch-all.sh` (copied unchanged from
  `../2026-09-23-adoption-remediation/`), `logs/measure-launch.sh` (adapted:
  evidence directory and arm roots only).
- `logs/`: one log per manifest row with the pins, the command, and quorum's
  `trials:` output.
- `runs/`: the run archives, stripped per `../README.md`.

## Results

Pending.
