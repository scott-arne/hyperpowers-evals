# Compaction re-read notice campaign

Paired measurement of whether a re-read notice in the SessionStart hook's
compaction output makes an agent re-read the skills it is following after an
automatic compaction, without sending a session that follows no skill to read
skill files. Spec:
`docs/hyperpowers/specs/2026-11-11-compaction-reread-notice-design.md` in the
hyperpowers repository (Testing and Evidence section).

Scenarios: `sdd-compaction-reread` (existing; control, treatment and shipped)
and `compaction-no-skill` (new, the sentinel; treatment only).

Arms:

- control: B, a pin-only commit on a side branch from `main` that removes the
  "After every context compaction" paragraph from SDD and brainstorming. It
  stands in for a session holding stale skill text. The side branch is never
  merged.
- treatment: B plus the notice.
- shipped: the slice commit, which adds the notice on top of `main` and keeps
  the paragraph.

A re-read is a successful Read, or a `cat`, of the skill's `SKILL.md` after a
compaction and before the next stop event (for SDD, the next dispatch or
compaction). For SDD it counts only when the lines read cover the cut text,
from the line holding character 20,000 of the arm's pinned `SKILL.md` (where
Claude Code's re-attached copy ends) to the last line. Whole-file reads and
offset reads that cover the cut text both count, and are reported separately.

## Pass bars

From the spec's Testing section:

- SDD control/treatment: treatment mechanism at least 8 of 10; treatment
  per-compaction rate at least 85%; treatment outcome at least the control's.
  A control mechanism above 3 of 10 stops the campaign for a decision.
- Shipped: outcome at least 9 of 10; per-compaction rate at least 90%; median
  compactions per run at most 16.
- Sentinel: at most 1 of 10 valid runs fail.

`tally.py` prints one line per bar; a cell with fewer than ten valid runs
reads `incomplete`. The control stop line reads `STOP` as soon as more than
three valid control runs show the mechanism, since that count cannot fall.

## Pins

| Pin | Value | Source |
| --- | --- | --- |
| harness | `474ea8c8dff4038337ef759ff410be8b9332b494` | the commit after the `compaction-no-skill` scenario commit `d0992ddb60`; harness paths (`src scenarios coding-agents package.json bun.lock`) must stay identical to it |
| control | filled in Task 5 | B, detached worktree `/Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/control` |
| treatment | filled in Task 5 | B plus the notice, detached worktree `/Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/treatment` |
| shipped | filled in Task 5 | the slice commit, detached worktree `/Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/shipped` |
| model | `claude-opus-5-5` | `ANTHROPIC_MODEL` must equal it in the launch shell |
| grader | `claude-opus-5-5` | `GAUNTLET_AGENT_MODEL` must equal it (`GRADER_PIN` in the launcher) |
| Claude Code | `2.1.317` | `CC_PIN` in `logs/measure-launch.sh`; the host's `claude --version` when the plan was written. Re-check before the campaign and update the pin here and in the script, in one commit, if the host has moved. |

Until Task 5 fills the three arm pins, `manifest.tsv` holds `<pin>` for each
and the launcher refuses every row. `tally.py` reads each SDD run's cut line
from the arm's pin in `manifest.tsv` (`git show <pin>:skills/subagent-driven-development/SKILL.md`
in the hyperpowers repository), never from a live checkout.

`launch-all.sh` is copied from `../2026-11-03-cost-reduction-6-16-2/` with the
`shipped` arm and pin key added; `logs/measure-launch.sh` is adapted from that
campaign's copy (evidence directory, arm roots). It checks every pin before
launching and writes `logs/<arm>-<scenario>-<proc>.log`, whose last line is
`DONE ...` or `FAILED <code> ...`. `archive-runs.sh` is adapted from
`../2026-11-10-sdd-dispatch-guard/archive-runs.sh` (arms only).

## Launching a wave

Four waves, one cell each: `manifest-wave1.tsv` (control SDD),
`manifest-wave2.tsv` (treatment SDD), `manifest-wave3.tsv` (shipped SDD) and
`manifest-wave4.tsv` (treatment sentinel). Each holds the five two-field pin
rows of `manifest.tsv` plus that cell's ten rows. Run from the evals clone,
with the proxy variables and `GAUNTLET_AGENT_MODEL` set as above:

```bash
ANTHROPIC_MODEL=claude-opus-5-5 bash evidence/2026-11-11-compaction-reread-notice/launch-all.sh evidence/2026-11-11-compaction-reread-notice/manifest-wave1.tsv 10 > /Users/johnss51/.cache/hyperpowers/compaction-reread-notice/logs/wave1.out 2>&1; echo "exit=$?" >> /Users/johnss51/.cache/hyperpowers/compaction-reread-notice/logs/wave1.out
```

The other waves are the same command with their manifest and `waveN.out`.
After wave 1, tally; if `SDD control mechanism stop (> 3)` reads `STOP`, the
campaign stops for a decision. The launcher refuses to start a row whose
`logs/<arm>-<scenario>-<proc>.log` already exists.

## Voids and replacements

Voids follow `../../docs/scenario-authoring.md`: an instrument failure is not a
trial. A void (launch, multi-run, no-record, setup, grader or instrument) is
replaced by a relaunch with proc `r1` to `r3`, at most three per arm and
scenario. An invalid run is a void: an SDD run with no compaction in the
window, or a sentinel run with no compaction before its last reply or with a
skill invoked before the first compaction. `launch-all.sh` accepts only `p`
procs, so launch a replacement by calling the launcher directly, for example:

```bash
ANTHROPIC_MODEL=claude-opus-5-5 bash evidence/2026-11-11-compaction-reread-notice/logs/measure-launch.sh control sdd-compaction-reread 1 r1 default
```

Each replacement needs its row in `sentinel-reruns.tsv`:
`<original run id><TAB><replacement run id>`, the quorum run ids from the
`run-id:` lines of the two launch logs. A void replacement is replaced in turn
by a row naming it as the original. Lines starting `#` are skipped; any other
row must hold exactly two non-empty fields. `tally.py` exits 1 when a rule is
broken.

## Archiving

For each arm:

```bash
bash evidence/2026-11-11-compaction-reread-notice/archive-runs.sh control evidence/2026-11-11-compaction-reread-notice/task-6-runs
```

It copies every run the arm's launch logs name from `results/` into
`task-6-runs/<arm>/`, applies the evidence hygiene, keeps
`home/.cache/hyperpowers` (the SDD ledger and gate rounds) whole, and checks
each copy against the outcome shapes in `../README.md` ("Before committing a
run", step 4). `results/` is left as quorum wrote it.

## Tallying

```bash
cd evidence/2026-11-11-compaction-reread-notice && python3 tally.py > tally.txt
```

`tally.py` prints one line per run (SDD runs end
`compactions=N followed=F whole=W`; sentinel runs end `failed=... reads=...`),
one count line per cell, the eight bar lines, and each SDD arm's pooled
per-compaction totals. `tally.py --run RUN_ID --arm ARM --scenario NAME`
tallies a single run (the smoke); `ARM` picks the pin whose cut an SDD run is
read against. `python3 -m unittest test_tally -v` runs the tally's tests,
which need no pins, network or live run.
