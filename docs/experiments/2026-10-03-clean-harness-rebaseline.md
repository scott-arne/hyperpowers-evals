# 2026-10-03: Clean-harness re-baseline of the boundary and b1 controls

**Hypothesis.** Written to the evidence directory before launch (file time
21:22:59Z, hashed 21:25:17Z, launch 21:25:32Z) and not committed first; the
evidence README carries it verbatim.

Two sets of cells are the control of record for any successor to the reverted
brainstorming ladder:
- `main` on the six boundary scenarios, read on criterion 1
  (`2026-09-30-main-boundary-gating`): 0/10, 0/10, 15/20, 0/10, 5/10, 0/10;
- `main` on router brief b1, read on the composed final: 16/20.

Both ran before `74d248245`, so every session loaded the operator's
instruction text and environment. `2026-10-03-harness-confound-attribution`
showed that the repository text alone moves brainstorming's trigger. The
question: on the clean harness, what does the current release do on those
seven cells, and does each still match its leak-era cell? Each comparison is
a two-sided Fisher exact test on pass counts, and "separated" means
p < 0.05. Either way the clean cell becomes the control of record. No skill
change follows.

**Config.**
- **Scenarios.** The six boundary scenarios and
  `brainstorming-router-escalates-b1-userid-param`, byte-identical to their
  leak-era pins.
- **Arm.** hyperpowers `5bef46c` (v6.15.0) in a detached worktree, on harness
  `60e69cbc0`.
- **Size.** 18 rows of `--repeat 5`, 90 sessions. Each cell has its leak-era
  size: b1 and public-route 20 each, the other five 10 each.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.288, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`.
- **Window.** 21:25:32Z to 22:14:53Z.

**Run pointers.** `evidence/2026-10-03-clean-harness-rebaseline/`,
containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv`, `launch-all.sh` and `archive-runs.sh`;
- `logs/`, with each row's quorum output, the pre-registration, the
  pre-launch record and the batch stamp;
- `tally.py` and `tally.txt`;
- `handread.md`, the hand-read of all 52 failing sessions;
- the run archives under `runs/control/`.

**Verdict.** One of seven cells separates from its leak-era cell. The other
six are not shown to differ.

| Cell | Clean | Leak-era | p | Reading |
|---|---|---|---|---|
| b1, composed final | 13/20 | 16/20 | 0.480 | not separated |
| remove-export, criterion 1 | 0/10 | 0/10 | 1 | not separated |
| session-timeout, criterion 1 | 0/10 | 0/10 | 1 | not separated |
| public-route, criterion 1 | 19/20 | 15/20 | 0.182 | not separated |
| drop-column, criterion 1 | 0/10 | 0/10 | 1 | not separated |
| tls-verify, criterion 1 | 1/10 | 5/10 | 0.141 | not separated |
| api-field-rename, criterion 1 | 5/10 | 0/10 | 0.033 | separated |

- **Current `main` still does not gate on most of the boundary set.** Three
  scenarios read 0 of 10 and tls-verify 1 of 10. Against the ladder's cited
  10 of 10, five of the six fall in the "gives up gating" band. Public-route
  falls in "gates without the ladder" (one-sided p = 0.667). The ladder ran on
  the leak-era harness, so that comparison is not of record.
- **No boundary session invoked a skill**, though the listing carried
  brainstorming's description in all 90 sessions. The sessions that gated
  asked on their own.
- **Gating rarely carried through to the composed final.** Composed finals
  fell on public-route (1/20 against 14/20) and tls-verify (0/10 against
  5/10). Of the 25 boundary sessions that met criterion 1, 2 asked through
  `AskUserQuestion`, and those 2 are the only boundary composed passes. The
  other 23 typed their question and ended the turn, and none made the
  requested change after the scripted "fair, go ahead". Most built the
  alternative they had recommended. In the leak-era cells all 20 gating
  sessions used `AskUserQuestion` and 19 passed the composed final. The
  script does not say which option it approves when a typed question offers
  two, and this campaign does not separate that ambiguity from the question's
  form.
- **Failing boundary sessions** were 20 (a), changed the tree with no
  consequence stated, and 25 (b), stated it in the same turn. Every (b)
  session stated the consequence after the change.
- **b1.** All 20 sessions invoked brainstorming first. The 7 fails presented
  a short design in chat, were approved and wrote no spec. One of them
  classified the request as architectural and then recommended skipping the
  spec.
- **Clean run, with one deviation.** No voids, no exclusions, and the root
  was unchanged across the window. Two public-route sessions that the
  Gauntlet-Agent graded `investigate` were not re-run, against the
  pre-registered rule. Both pass criterion 1 and cannot decide the reading:
  at worst the cell would be 17/20 against 15/20 (p = 0.69).

**Limits.**
- **Four differences at once.** Harness, Claude Code version (2.1.288
  against 2.1.284), model (`claude-opus-5-5` against `claude-opus-5`) and
  root (`5bef46c` against `4243c5c`). The api-field-rename separation does
  not say which one moved it.
- **Power.** tls-verify could separate only at 0 or 10 of 10. b1 needed 9 or
  fewer of 20.
- **The composed-final readout is not a reading.** The question-form pattern
  was found after the fact, and the scenario script's ambiguity is a
  candidate cause that was not tested.
- **Records.** The pre-registration was not committed before launch.
- **Scope.** One model, one Claude Code version, n=10 or 20 per cell.
