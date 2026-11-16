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
| control | `c149134f54c22031df5c46e3a62674192485adcc` | B, detached worktree `/Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/control` |
| treatment | `cff2528683d66f0971528fbe64f0ad599a569098` | B plus the notice, detached worktree `/Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/treatment` |
| shipped | `ffb81ef8484cfeb4dcde76a4a2eacfd73054d53c` | the slice commit, detached worktree `/Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/shipped` |
| slice | `d00c689ff2addd5438a09e35f0bd355f7bd83b96` | the integration branch head after Tasks 7-10 (the compact controller and the notice), detached worktree `/Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/slice` |
| controller | `96edc68e337af67f237cc1f65d65094ee8519216` | the integration branch head after Task 14 (the compact controller without the notice), detached worktree `/Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/controller` |
| model | `claude-opus-5-5` | `ANTHROPIC_MODEL` must equal it in the launch shell |
| grader | `claude-opus-5-5` | `GAUNTLET_AGENT_MODEL` must equal it (`GRADER_PIN` in the launcher) |
| Claude Code | `2.1.317` | `CC_PIN` in `logs/measure-launch.sh`; the host's `claude --version` when the plan was written. Re-check before the campaign and update the pin here and in the script, in one commit, if the host has moved. |

The launcher refuses a row whose arm pin in `manifest.tsv` is missing or
still a `<pin>` placeholder. `tally.py` reads each SDD run's cut line
from the arm's pin in `manifest.tsv` (`git show <pin>:skills/subagent-driven-development/SKILL.md`
in the hyperpowers repository), never from a live checkout.

The `controller` pin row (revision 2, below) is added to `manifest.tsv`
before its wave, with its detached worktree at
`/Users/johnss51/.cache/hyperpowers/compaction-reread-notice/arms/controller`.
`tally.py` reads the `controller` step files' line counts from that pin and
exits 1 when a `controller` log exists without it.

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

The revision's waves used `manifest-revision-a.tsv` and
`manifest-revision-b.tsv`. Revision 2's single wave uses
`manifest-revision-c.tsv`: the pin rows of `manifest.tsv` (the `controller`
pin row included) plus ten `controller` rows on `sdd-compaction-reread`
(`p1`-`p10`). The launcher refuses a `controller` run on any other scenario
(exit 2, `controller runs only on sdd-compaction-reread`).

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
cd evidence/2026-11-11-compaction-reread-notice && python3 tally.py --waves-1-2 > tally.txt
```

`python3 tally.py --waves-1-2` reads the control, treatment and shipped logs
and reproduces `tally.txt`; plain `python3 tally.py` prints the revision (see
"Revision (2026-11-12)" below). Under `--waves-1-2`, `tally.py` prints one line per run (SDD runs end
`compactions=N followed=F whole=W`; sentinel runs end `failed=... reads=...`),
one count line per cell, the eight bar lines, and each SDD arm's pooled
per-compaction totals. `tally.py --run RUN_ID --arm ARM --scenario NAME`
tallies a single run (the smoke); `ARM` picks the pin whose cut an SDD run is
read against. `python3 -m unittest test_tally -v` runs the tally's tests,
which need no pins, network or live run.

## Outcome (2026-11-12): campaign stopped after wave 2

Wave 1 (control) gave 10 valid runs: all 10 finished the plan, none re-read
the skill (4 of 93 compactions followed). Wave 2 (treatment) gave 10 voids:
every run ended in Claude Code's "Autocompact is thrashing" stop with no
subagent dispatched, so `sdd_reading` has no task loop to time and marks each
one `instrument`. In the traced run (`...231620Z-11c2`) the first compaction
came during SDD setup at about 68K tokens. After it the session followed the
notice, read SKILL.md (truncated banner, then offset 824) and compacted again
35 to 40 seconds later at about 66K; that repeated nine times. In this
scenario's 100K window, one full read of the 76K-character SDD skill after a
compaction refills the context. No replacements were launched, since each
would repeat the loop, and waves 3 (shipped) and 4 (sentinel) were not run.
The notice goes back to design. `tally.txt` and `task-6-runs/` hold waves 1
and 2; `manifest-wave3.tsv` and `manifest-wave4.tsv` are the unrun waves.

## Revision (2026-11-12)

The SDD skill was redesigned as a compact controller (`SKILL.md` under
20,000 characters) with a step table that sends a resumed session to one of
five step files: `setup.md`, `task-loop.md`, `review-and-complete.md`,
`fix-loop.md` and `final-and-finish.md`. The spec's "Revision (2026-11-12): a
compact SDD controller" section and "Testing (revised)" govern; `python3
tally.py` prints this reading.

Arms:

- `baseline-6181` (control): released v6.18.1
  `7f7c399ca1eef6e931d01fa47c02303eef32f44a`, logs `logs/baseline-6181-p<k>.log`
  from the 2026-11-12 baseline, and replacements
  `logs/baseline-6181-sdd-compaction-reread-r<n>.log` from `measure-launch.sh`.
- `slice` on `sdd-compaction-reread` (treatment) and on `compaction-no-skill`
  (sentinel), logs `logs/slice-<scenario>-<proc>.log`.
- `controller` (revision 2, 2026-11-13; spec decision 13): the integration
  head after the notice comes out, on `sdd-compaction-reread` only, logs
  `logs/controller-sdd-compaction-reread-<proc>.log` (`p1`-`p10`, `r1`-`r3`).
  It is read exactly as the `slice` SDD cell (validity, outcome, thrash,
  dispatches and the per-compaction counts), with step-file line counts from
  its own pin. `tally.py` exits 1 on a `controller` log for any other
  scenario. The `slice` results stand as measured; there is no sentinel wave.

The old arms (`control`, `treatment`, `shipped`) are read only under
`--waves-1-2`.

The 2026-11-12 baseline is the control. Its harness paths at its evals head
`ec9c079d8b` are identical to the pin `474ea8c8df`; it ran on Claude Code
2.1.317 with controller and grader `claude-opus-5-5` (checked 2026-11-12).
Its logs predate the launcher and carry no scenario in their names, so
`measure-launch.sh` launches `baseline-6181` only as a replacement
(`r<n>` on `sdd-compaction-reread`). The `slice` pin row is added to
`manifest.tsv` before the campaign; `tally.py` exits 1 when a `slice` log
exists without it, since it reads each step file's line count from that pin.

SDD validity (every revision SDD arm; replaces the 6.16.2 window rule): void kinds
`launch`, `setup`, `grader`, `instrument` (as `void_kind` and the log rules
read them today) and `no-compaction` (no automatic compaction after the SDD
skill event). Every other run is valid. Outcome passes when
`final_reading(verdict) == "pass"`, `post_checks_pass(verdict)`, and the run
dispatched at least one `implement` subagent. A run ending in the thrash stop,
or with no dispatch, is valid and fails its outcome. Thrash: a main-thread
assistant entry whose `message.model` is `<synthetic>` and whose text holds
`Autocompact is thrashing`; the run row shows `thrash=1`.

Treatment per compaction (each automatic compaction after the SDD skill
event): the state is `step_state` over this session's ledger lines written
before it; the compaction is followed when, before the next governed action,
(a) the session made a credited Read covering the step file that state names
(a whole Read, or Reads whose ranges cover every line of that file at the
arm's own pin, `slice` or `controller`), and (b) when a ledger existed, an `sdd-state board` call
returned a result holding `status=board`, and a `grep` over `progress.md`
returned a result holding this session's `session <sid>: setup complete` line
and, when a task is held, at least one `Task <N>:` line of that task. Governed
actions: an Agent dispatch, a compaction, or a Bash call that writes the
ledger (`>>` and `progress.md`) or runs an `sdd-state` subcommand other than
`board`. An unreadable state (`step_state` returns None) is not followed.
Bash evidence is read where the call's result arrives: a call with an error
result writes no ledger lines and earns no recovery credit, but still counts
as a governed action. Each `slice` and `controller` SDD run line ends
`compactions=N followed=F any_step=S ledger_parts=L skill=K` (any step file
read; board and grep both credited; SDD `SKILL.md` read), and the cell line
pools them over valid runs.

Bars:

1. `slice` SDD outcome at least 8 of 10 valid and more than `baseline-6181`'s.
2. No valid `slice` SDD run with `thrash=1`.
3. At least 85% of pooled `slice` SDD compactions followed.
4. Median `slice` SDD compactions per run at most 16.
5. Sentinel failures at most 1 of 10.

Revision 2 bars, `controller` as the treatment (bars 1-4 of the revised spec;
a FAIL is a result to report, not a reason to re-run):

1. `controller` SDD outcome at least 8 of 10 valid and more than
   `baseline-6181`'s.
2. No valid `controller` SDD run with `thrash=1`.
3. At least 85% of pooled `controller` SDD compactions followed.
4. Median `controller` SDD compactions per run at most 16.

`tally.py` prints the `controller` cell line and these four bar lines after
the five above, once `manifest.tsv` holds a `controller` pin or a
`controller` run exists; until then its output is unchanged. A cell with
fewer than ten valid runs reads `incomplete` and its bars read
`incomplete`. The sentinel is read as before (`noskill_reading`). Replacements
go in `sentinel-reruns.tsv` as above, at most three per cell (`r1`-`r3`).
