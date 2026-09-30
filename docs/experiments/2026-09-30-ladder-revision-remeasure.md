# 2026-09-30: a revised bootstrap ladder on router brief b1 and the six boundary scenarios

**Hypothesis.** Pre-registered at `9194d07` before any session launched. The ladder b1 re-measure (`2026-09-30-ladder-router-b1-remeasure.md`) found the bootstrap ladder regressing router brief `brainstorming-router-escalates-b1-userid-param` from control's 16 of 20 to 6 of 20. It read the cause from transcripts: the sessions sized the request by its edit ("one function, one caller, one file"), not by the outcome it names. The human partner's decision was to revise the ladder so that it decides only whether brainstorming runs, and to revert the ladder if the revision fails b1. Candidate A adds one paragraph after rung 3 of `using-hyperpowers` and leaves the rungs unchanged: "A rung that sends you to brainstorming decides only that brainstorming runs. What you checked on the way (the lines, callers, and files your edit would touch) does not size the work: brainstorming classifies its path by the outcome the request names." A session passes b1 when its composed final verdict is pass. The bar is treatment at least 14 of 20. A regression is treatment below control at a one-sided Fisher exact p < 0.05, which is 10 of 20 or below, and it reverts the ladder. On the six boundary scenarios, criterion 1 must hold in at least 9 of 10 sessions. Two guards were added: `brainstorming-bounded-fires-approach-gate` against its own same-day control, and `cost-checkbox-over-trigger` at no more than 1 over-trigger in 10. A 5-session screen decided whether A advanced to the confirmatory stage. The fallback, candidate B, was A plus one Red Flags row.

**Config.** Treatment: `external-workflow-adoption` at `7f8a54b3b925df1bfdb5794f1d555f671d6af50c`. It differs from the old-ladder tree measured in the b1 re-measure (`10b1773`) only by candidate A's paragraph in `skills/`, `hooks/` and `.claude-plugin/`. Control: hyperpowers `main` at `3bdb5b2eaff30088e483fea3eae9a8c8b7d7e650`. The b1 control cell (16 of 20) was reused from the b1 re-measure earlier the same day, under the four pre-registered reuse conditions, all re-checked at both launches. Bounded-fires ran its control fresh. Harness: this repository at `d657476`. Model `claude-opus-5` through `claude-auto`, Claude Code 2.1.284, default listing budget, judged by the Gauntlet-Agent on `claude-opus-5-5`. Screen: 2 rows of `--repeat 5` on treatment (b1 and bounded-fires), 20:53:31Z to 21:47:10Z. Confirmatory: 22 rows of `--repeat 5`, 110 sessions, 8 concurrent, launched 21:50:13Z, last session finished 22:53:41Z. Then five re-runs of real indeterminates, launched 22:54:31Z to 22:55:51Z and finished by 23:09:46Z. There were no grader voids and no setup voids.

**Run pointers.** `evidence/2026-09-30-ladder-revision/`, containing:
- `README.md`, with the pre-registration, the screen hand-read and the confirmatory results;
- `manifest-screen.tsv` and `manifest.tsv`;
- `logs/`, with the row logs `p<n>`, the re-runs `r<n>`, and `logs/screen/`;
- `superseded.txt`;
- `tally.py` and `tally.txt`;
- `archive-runs.sh`;
- the 125 run archives under `runs/<arm>/<run-id>/`.

**Verdict.** Regression: the pre-registered negative, so the ladder reverts. Treatment passed b1 in 7 of 20 against control's 16, one-sided Fisher p = 0.0048. The other 13 are 11 fails and 2 sessions that stayed indeterminate after their one re-run, which count as not passing. A is not separated from the ladder it was meant to fix: the old ladder's 6 of 20 against A's 7 gives p = 0.5000. The reading does not depend on the grader's indeterminates. Counted as passes, they give 9 of 20 and p = 0.0242. Counting every session that wrote a spec as a pass gives 10 of 20 and p = 0.0479. The screen had advanced A at 3 of 5 b1 passes; the confirmatory stage did not hold that rate. Everything that could only block the revision held:
- All six boundary scenarios met criterion 1 in 10 of 10.
- Bounded-fires passed 10 of 10 in both arms, with no spec written in either (p = 1.0).
- Checkbox over-triggered 0 of 10.

The hand-read, recorded before the confirmatory launch, predicted this. A did not move the first classification. All 30 b1 sessions in the campaign were read (screen, manifest and re-runs):
- 28 opened bounded, citing the existing `login()` and its single caller.
- Two named no path first. One of them labelled nothing until its later upgrade "from a bounded change".
- None opened architectural.

The old ladder opened bounded in 20 of 20. Every pass, and every indeterminate that wrote a spec, was a late upgrade after the brief's scripted clarification. A's paragraph echoes brainstorming's classify-by-outcome rule, and it did not reach the moment it was written for: once the ladder has sent the agent to brainstorming, the agent still takes its opening classification from the edit.

**Limits.**
- **Scope.** One brief, one model, one Claude Code version.
- **Reused control.** The b1 control was measured earlier the same day, not alongside the treatment. The reuse conditions pin the versions and the tree, but not whatever else drifted between the two batches.
- **Candidate B was never screened.** A advanced at the screen, so the pre-registered path went straight to the confirmatory stage and then to the revert. Whether a Red Flags row that names the "one function, one caller" rationalization would do better is unmeasured.
- **The indeterminates.** Seven sessions came back indeterminate: five originals and two of their re-runs. Every one was a Gauntlet-Agent `investigate` on a completed session that wrote a spec. That late upgrade is where the composed verdict is least certain, which is why the two sensitivity counts above matter.
- **Weak guards.** At n=10 against 10 of 10, bounded-fires catches only an over-escalation to 6 of 10 or below.
- **Boundary scenarios at ceiling.** They sat at 40 of 40 on criterion 1 in Phase 3 and at 10 of 10 here, so they cannot separate arms. They only confirm that A did not break the ladder's gating.
- **Composed finals not compared.** Four boundary sessions met criterion 1 but failed their composed final on criterion 3, doing a safer alternative after the go-ahead: two public-route and two tls-verify sessions. They do not bear on the gate and were not compared with Phase 3's composed finals.
- **The mechanism.** The mechanism reading is an interpretation of transcripts.
