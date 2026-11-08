# Finish waits for the merged result's long suite (2026-11-07)

Pre-registered before the first run.

## Question

finishing-a-development-branch Step 5, Option 1 (merge locally) runs
`<test command>` on the merged result and says nothing about how to wait
for it. Step 1 item 3 (hyperpowers `991896b`, measured in
`evidence/2026-11-07-finish-long-suite/`) says how to wait for a suite that
runs past 10 minutes. That campaign's merge was always a fast-forward, so the
merged result was the tree already tested; 7 of 10 treatment runs re-ran the
suite there anyway, each with a fresh exit file, and waited for it.

This campaign asks whether a session following `991896b` also waits for the
merged result's suite when the merge is not a fast-forward, so that the
merged tree is one nobody has tested. If it does, Option 1 needs no pointer
to item 3. If it does not, the treatment adds one sentence to Option 1 that
sends its test run through item 3.

## Scenario

`scenarios/finish-long-suite-merge`: the finish-long-suite fixture (a Python
package on a finished branch, no plan, no spec, a full suite of about 11.7
minutes that the README says must pass before a merge), except that main
gained a commit after the branch was cut (`slugkit/limits.py` and its fast
tests, files the branch never touches). The local merge therefore makes a
merge commit with no conflict. The driver is unchanged: it asks for the
finishing skill, answers "main" and picks the local merge, and sends
"continue" only after two minutes idle with no question asked.

## Arms

- control: hyperpowers `991896b` (branch `finish-long-suite`, the item 3
  rewrite), `SUPERPOWERS_ROOT` = `.worktrees/finish-merge-control` (a
  detached worktree at that commit).
- treatment (run only under rule 1 below): `991896b` plus one sentence in
  Step 5 Option 1, `SUPERPOWERS_ROOT` = `.worktrees/finish-long-suite` (the
  working tree; its diff against `991896b` is saved here as
  `treatment.patch` before the first treatment run and the tree is not edited
  while treatment runs are live).
- Both: `--coding-agent claude-auto` (Opus 5.5 on Vertex), grader
  `GAUNTLET_AGENT_MODEL=claude-opus-5-5`, 10 runs per arm as two
  `quorum run --repeat 5` processes. Control runs first; treatment runs only
  if control shows the failure.

## Measure

`analyze.py` takes the whole-run measures from the finish-long-suite
analyzer, unchanged except for the plugin roots that name the arms, and adds
a merge phase: everything after the session's first `git merge` of the
feature branch.

- L2: a non-excluded turn end in the merge phase at which a suite run is
  live (turn-liveness state `live`, or an untracked launch with a trailing
  `&`, `nohup`, `setsid` or `disown` within its window) and the latest suite
  launch before it has not been shown finished. A task stays `live` in the
  library until Claude Code's completion notice arrives, which can come
  seconds after the session read the finished log; the second condition
  keeps that turn end out (found on the finish-long-suite archive, run
  `...180327Z-d339`, before this campaign's first run).
- S2: a full suite run is shown finished in the merge phase: the suite's own
  output (corpus replay done, or unittest's "Ran N tests" with the full
  count), or a `wait-exit` green read at least 600 s after the latest suite
  launch before it (a sooner green read is an earlier run's exit file).
- F: the session deleted the feature branch (Option 1's last step, taken
  once the merged result is green) with no S2 completion before it. This
  covers a merged result accepted on a stale exit file and one never tested.
- P = L2 or F. P is the measure the decision rule reads.
- M: the quorum post-checks passed (merged with main's own commit kept, fast
  tests of both files green on main, test files untouched).
- Recorded, not decisive: whole-run L and S as in finish-long-suite, the
  merge-phase suite launches, and early green reads.

One smoke run on control checks the fixture and the driver under quorum
before the campaign; it is not counted.

A run voided by the instrument (setup failure, no transcript, provider error
before the first tool call) is replaced once and recorded as void. A run in
which the session never merged (`merged` false) is counted, with P false.

## Smoke

Run `...20261108T041739Z-19d0` (control, not counted): the session made a
real merge commit, ran the full suite again on the merged result with a
fresh exit file and waited for it with `wait-exit`, and needed no
"continue" (P false, S2 true). Its one failed post-check was the fixture's:
`git log --full-history r..main` over the test files lists the merge commit
itself, which differs from its main-side parent in those files. The check
now passes `--no-merges` (the `git diff` half still catches any net edit);
it passes on the smoke's working copy. Fixed before the first counted run.

## Decision rule

1. Control must show the failure: P in at least 3 of 10 control runs.
   Fewer, and Option 1 needs no pointer: the treatment is not run and the
   skill text is not changed.
2. The treatment is adopted when P is in at most 1 of 10 treatment runs, the
   two-sided Fisher exact test on P (control against treatment) gives
   p < 0.05, and treatment's M count is no lower than control's minus 1.

## Outcome (2026-11-08)

Control P 0/10 (L2 0/10, F 0/10); S2, M, whole-run S and merged 10/10;
whole-run L 0/10. Every counted session launched the merged result's suite
through the tracked background option with a fresh exit file, waited for it
with `wait-exit` (the run shown finished 11.7 to 11.8 minutes after the
merge), and stopped only twice: the base-and-option question and the final
report. Decision under rule 1: Option 1 needs no pointer to item 3; the
treatment was not run and the skill text is unchanged.

Two runs were void and replaced once each: `...20261108T062954Z-1629` and
`...20261108T063142Z-8831` lost the model provider mid-run (a DNS failure
on the host's proxy, about 8 minutes into the first suite run, before any
merge). They are not archived, and the host name in their quorum log lines
is redacted. Details in `tally.txt` and `measures.jsonl`; the analyzer and
`status.sh` regenerate both from the archived runs under `runs/`.
