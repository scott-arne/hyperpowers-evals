# Finish keeps its turn open through a long suite (2026-11-07)

Pre-registered before the first run.

## Question

finishing-a-development-branch Step 1 item 3 says to run the project's full
suite "in the foreground". Claude Code caps a foreground call at 10 minutes.
SDD's tracked-job recipe does not reach Finish: SDD removes its ledger
(`sdd-state finish`) before it hands off, and `tracked-job new` needs the
ledger. A field session (Zed, 2026-11-07, the parallel-development Finish)
started a 25-minute suite in the background and ended its turn, and Zed
showed the session idle while the suite ran.

The treatment rewrites the test-run sentence of item 3: a suite expected to
finish within 10 minutes runs in the foreground with an explicit timeout; a
longer one starts through the tracked background option with its exit status
written to a file, and the session waits in the foreground with repeated
`scripts/wait-exit <file> --max-ms 600000` calls.

## Scenario

`scenarios/finish-long-suite`: a Python package on a finished branch with no
plan and no spec (Finish's test-only path). The full suite takes about 11.7
minutes (35 corpus entries at 20 seconds); the README says it takes about 12
minutes and must pass before a merge. The driver asks for the finishing skill,
answers "main" for the base and picks the local merge, and sends "continue"
only after two minutes idle with no question asked.

## Arms

- control: hyperpowers v6.17.0 (29b3cae), `SUPERPOWERS_ROOT` =
  `.worktrees/plugin-install`.
- treatment: branch `finish-long-suite` from 29b3cae with the item 3 rewrite
  and `scripts/wait-exit`, `SUPERPOWERS_ROOT` = `.worktrees/finish-long-suite`
  (the working tree; its diff against 29b3cae is saved here as
  `treatment.patch` before the first treatment run and the tree is not edited
  while treatment runs are live).
- Both: `--coding-agent claude-auto` (Opus 5.5 on Vertex), grader
  `GAUNTLET_AGENT_MODEL=claude-opus-5-5`, 10 runs per arm as two
  `quorum run --repeat 5` processes.

## Deviations

1. Treatment restarted (2026-11-07 18:20 UTC). The first treatment launch
   (`treatment-v1.patch`) bounded `wait-exit` by a count of 200 ms polls; in
   run `...180347Z-5efb` a `--max-ms 540000` call ran past its 600 s tool
   timeout and Claude Code moved it to the background (the session waited
   again and did not end its turn). Both treatment processes were stopped,
   their two in-flight runs (`...180347Z-5efb`, `...180407Z-8058`) are void
   and not counted, the helper now reads its bound from the clock (offline
   test added for slow polls), and the treatment arm restarted from zero on
   `treatment.patch`. Control was not touched.

## Measure

`analyze.py` reads each run's main-session transcript with the turn-liveness
library (`evidence/2026-10-19-sdd-turn-liveness/liveness.py`, unchanged):

- L: the run has at least one non-excluded turn end at which a tracked
  background task is live (state `live`), or at which a suite command started
  with a trailing `&`, `nohup`, `setsid` or `disown` had not yet been
  followed by its result (`untracked`).
- S: the session ran `tests/test_corpus.py` (directly or through unittest
  discovery) to completion inside the session.
- M: the quorum post-checks passed (merged, fast tests green on main, test
  files untouched).

One smoke run on control checks the fixture and the driver under quorum
before the campaign; it is not counted in either arm.

A run voided by the instrument (setup failure, no transcript, provider error
before the first tool call) is replaced once and recorded as void.

## Decision rule

1. Control must show the failure: L in at least 3 of 10 control runs. Fewer,
   and there is nothing to fix; the skill text is not changed.
2. The treatment is adopted when L is in at most 1 of 10 treatment runs, the
   two-sided Fisher exact test on L (control against treatment) gives
   p < 0.05, and treatment's S and M counts are each no lower than control's
   minus 1.

## Outcome (2026-11-07)

Control L 10/10 (50 live turn ends), treatment L 0/10; S and M 10/10 in both
arms; two-sided Fisher p = 1.08e-05. Decision: adopt. Details in `tally.txt`
and `measures.jsonl`; the analyzer and `status.sh` regenerate both from the
archived runs under `runs/`.
