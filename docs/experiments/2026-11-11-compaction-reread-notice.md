# 2026-11-11: compaction re-read notice and its revision, a compact SDD controller (FAIL); the controller alone (bars 1, 2 and 4 PASS, bar 3 FAIL)

## Hypotheses

First hypothesis. A notice in the `hooks/session-start` compaction output
that tells the session to Read in full each hyperpowers skill it is
following restores the re-read after a compaction, including in a session
that holds skill text without the "After every context compaction"
paragraph. Spec: `docs/hyperpowers/specs/2026-11-11-compaction-reread-notice-design.md`
in hyperpowers, Testing and Evidence.

Second hypothesis, after the notice arm thrashed. An SDD `SKILL.md` small
enough to come back whole after a compaction (under 19,000 characters),
plus one step file the session picks from a step table by its ledger
state, keeps SDD working at a 100,000-token window: the plan finishes, no
run ends in Claude Code's "Autocompact is thrashing" stop, and most
compactions are followed by the board, the task's ledger lines and the
named step file. Spec: the same file, "Revision (2026-11-12): a compact SDD
controller" and "Testing (revised)".

Third hypothesis, after the notice was removed (spec decisions 11 to 13).
The same controller and step files with no compaction notice keep SDD
working at a 100,000-token window: the plan finishes in at least 8 of 10
valid runs, no run ends in the thrash stop, at least 85% of compactions
are followed by the board, the task's ledger lines and the named step
file, and the median is at most 16 compactions per run. The SDD paragraph
regains v6.18.1's clause for other skills whose re-attached copy is cut
short. Spec: the same file, "Revision (2026-11-13): the controller without
the notice" and "Testing (second revision)".

## Config

Harness pin `474ea8c8dff4038337ef759ff410be8b9332b494` (paths `src scenarios
coding-agents package.json bun.lock`, checked identical at every launch),
Claude Code 2.1.317, coding agent `claude-auto` with `ANTHROPIC_MODEL`
`claude-opus-5-5`, Gauntlet-Agent `claude-opus-5-5`. Both scenarios set
`autoCompactWindow` to 100000. Pins are in
`evidence/2026-11-11-compaction-reread-notice/manifest.tsv`.

First campaign (2026-11-12), `sdd-compaction-reread`:

- control `c149134f54c22031df5c46e3a62674192485adcc`: the paragraph removed
  from SDD and brainstorming, a pin-only side branch never merged;
- treatment `cff2528683d66f0971528fbe64f0ad599a569098`: control plus the
  notice;
- shipped `ffb81ef8484cfeb4dcde76a4a2eacfd73054d53c` (sdd-compaction-reread)
  and the treatment sentinel (`compaction-no-skill`): planned as waves 3
  and 4, never run.

Revised campaign:

- `baseline-6181`, control: released v6.18.1
  `7f7c399ca1eef6e931d01fa47c02303eef32f44a` on `sdd-compaction-reread`,
  the ten runs of the 2026-11-12 baseline. Their harness paths at evals
  `ec9c079d8b` are identical to the harness pin.
- `slice`, treatment: `d00c689ff2addd5438a09e35f0bd355f7bd83b96` on
  `sdd-compaction-reread`, launched 2026-11-13 18:18Z
  (`manifest-revision-a.tsv`).
- `slice`, sentinel: the same pin on `compaction-no-skill`, launched
  19:07Z (`manifest-revision-b.tsv`), one replacement at 19:12Z.

Second revision (2026-11-13):

- `controller`, treatment: `96edc68e337af67f237cc1f65d65094ee8519216`,
  the integration head after the notice came out, on
  `sdd-compaction-reread`, launched 2026-11-13 22:48Z
  (`manifest-revision-c.tsv`). Against the slice pin, only
  `hooks/session-start` (the notice removed) and the SDD paragraph (the
  clause regained) differ.
- Control: the same ten `baseline-6181` runs, not run again. Same harness
  pin, Claude Code version, models, window, validity rules and
  replacement cap. No sentinel wave, and the `slice` results stand.

Outcome passes when the final reading is pass, every post-check passes and
the run dispatched at least one implementer; a thrash stop or a run with no
dispatch is valid and fails. Validity, the per-compaction rule and the bars
are in the evidence README, "Revision (2026-11-12)".

Two departures from the plan. The tally as first written read the five
slice SDD runs that ended in the thrash stop as grader voids, since the
Gauntlet-Agent returned `investigate` for each; the spec counts a thrash run
as a valid failure, `tally.py` was fixed (`0b2702aa90`), and the five count
as valid failures with none replaced. And this campaign's archive and
commits keep no dollar figure; the claim covers nothing else in this
repository. The 2026-11-11 rewrite's two rules (quorum's dollar column
dropped; `costUSD`, `totalCostUSD`, `lastCost`, `est_cost_usd`,
`total_cost_usd`, `total_est_cost_usd` and `cost_usd` set to null) were
applied to the new archive and to 27 files already committed by the waves
1-2 commit (`6a590734fa`, empty after the 2026-11-15 rewrite, which
folded the nulling into the commits that added those files,
`ec9c079d8b` through `0b2702aa90`; see
`evidence/history-rewrite-2026-11-15.tsv`). A null cost value in an
archived run comes from that scrub, not from capture. The tally output was byte-identical before
and after.

## Run pointers

Paths are under `evidence/2026-11-11-compaction-reread-notice/task-6-runs/`.
`tally.txt` (`python3 tally.py --waves-1-2`) reads the first campaign and
`tally-revision.txt` (`python3 tally.py`) the revised one. Commits:
`ec9c079d8b` (waves 1-2 and the stop), `54f5fbdf0c` (revised runs and
tally), `d8e6825286` (controller pin), `af9879ccbb` (controller runs and
tally). `tally-revision-2.txt` (`python3 tally.py` at `af9879ccbb`) reads
all three revision arms.

- `control/`: ten runs `sdd-compaction-reread-claude-auto-20261112T224035Z-*`.
- `treatment/`: ten runs `sdd-compaction-reread-claude-auto-20261112T231620Z-*`;
  the traced run is `...-11c2`.
- `baseline-6181/`: ten runs `sdd-compaction-reread-claude-auto-20261112T2337*Z-*`.
- `slice/`: ten SDD runs `sdd-compaction-reread-claude-auto-20261113T181816Z-*`,
  ten sentinel runs `compaction-no-skill-claude-auto-20261113T190718Z-*`
  and the replacement `compaction-no-skill-claude-auto-20261113T191201Z-3b39`
  for the void `...-c178` (`sentinel-reruns.tsv`).
- `controller/`: ten SDD runs `sdd-compaction-reread-claude-auto-20261113T224803Z-*`,
  all valid, none replaced.

The Task 1 smoke, `compaction-no-skill-claude-auto-20261112T071537Z-f939`,
is not a trial and was not archived.

## Verdict

First campaign, from `tally.txt`. The control gave 10 valid runs, all
finishing the plan, and followed 4 of 93 compactions (4%) with a re-read.
The treatment gave 10 runs, every one ending in the thrash stop with no
subagent dispatched; the tally of that time marked each an `instrument`
void, so `tally.txt` shows `valid=0 voids={'instrument': 10}`. In the
traced run the first compaction came during SDD Setup at about 68K tokens,
the session read `SKILL.md` and compacted again 35 to 40 seconds later at
about 66K, nine times. The campaign stopped after wave 2.

Baseline, from `tally-revision.txt`. Released v6.18.1 finished 0 of 10:
all 10 runs ended in the thrash stop, 9 with no subagent dispatched and p5
(`...-f82f`) with one implementer. 49 compactions, median 4 per run.

Revised campaign, per bar, copied from `tally-revision.txt`:

```text
bar 1, slice SDD outcome (at least 8 of 10 valid, and more than baseline-6181's): FAIL
bar 2, slice SDD thrash (no valid run with thrash=1): FAIL
bar 3, slice SDD compactions followed (at least 85%, valid runs pooled): FAIL
bar 4, slice SDD median compactions per run (at most 16): FAIL
bar 5, sentinel failures (at most 1 of 10): PASS
```

1. Outcome: `slice` 5 of 10 valid against the baseline's 0 of 10, below
   the bar of 8.
2. Thrash: 5 of 10 `slice` runs ended in the thrash stop (p4 `...-cb7f`,
   p5 `...-22a7`, p6 `...-7ec4`, p9 `...-54ce`, p10 `...-9a78`). By their
   Gauntlet summaries each had implemented and reviewed all four tasks, run
   the final review and loaded finishing-a-development-branch, and stopped
   before offering the finish options.
3. Per compaction: 49 of 208 followed (24%). A step file was read after
   77, the board and the ledger grep were both credited after 129, and the
   SDD `SKILL.md` was read after 141.
4. Median compactions per run: 19, above 16.
5. Sentinel: 0 of 10 valid runs failed; no valid run read a skill file
   after a compaction. One grader void (p9 `...-c178`, whose Gauntlet
   summary says no compaction happened), replaced by r1.

Second revision, per bar, copied from `tally-revision-2.txt`:

```text
bar 1, controller SDD outcome (at least 8 of 10 valid, and more than baseline-6181's): PASS
bar 2, controller SDD thrash (no valid run with thrash=1): PASS
bar 3, controller SDD compactions followed (at least 85%, valid runs pooled): FAIL
bar 4, controller SDD median compactions per run (at most 16): PASS
```

1. Outcome: `controller` 10 of 10 valid against the baseline's 0 of 10
   (and `slice`'s 5 of 10). PASS.
2. Thrash: 0 of 10 `controller` runs ended in the thrash stop (baseline
   10, `slice` 5). PASS.
3. Per compaction: 30 of 126 followed (24%), below the bar of 85%. FAIL.
   The board and the ledger grep were both credited after 94, a step file
   of any kind was read after 38, and the SDD `SKILL.md` after none. By the
   tally's definition a followed compaction needs the named step file read
   before the next governed action, so the 88 compactions with no step-file
   read are all unfollowed: 88 of the 96 unfollowed. That is arithmetic on
   the tally's definitions; the records do not say why the sessions
   skipped the read.
4. Median compactions per run: 11, within 16. PASS.

The notice stays off any release (the human partner's decision), and the
branch no longer carries it. The hyperpowers evidence note is
`docs/hyperpowers/2026-11-11-compaction-reread-notice-eval-evidence.md`.

## Limits

One four-task plan, one 100,000-token window, one controller model and
one Claude Code version. The baseline runs predate the revised launcher;
they stand as the control because their harness paths match the pin, and
their logs carry no scenario in their names. The slice SDD subagents ran
on `claude-sonnet-5-5`, two runs also on `claude-haiku-4-5-20251001`; the
controller SDD subagents ran on `claude-sonnet-5-5`, four runs also on
`claude-haiku-4-5-20251001`. The controller arm had no sentinel wave. The
brainstorming compaction scenario was not run. Whether a hook edited on
disk reaches a running session is unresolved: session `ec562ba3`'s
2026-11-10T16:55Z compaction printed an `sdd/` ledger path, which either
the 6.16.1 or the 6.17.0 hook could print. The field re-measure is owed on
or after 2026-11-18.
