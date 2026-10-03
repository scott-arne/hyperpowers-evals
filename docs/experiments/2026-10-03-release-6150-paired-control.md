# 2026-10-03: v6.15.0 release, paired control for the over-trigger sentinel failure

**Hypothesis.** Written to the operator's scratch directory before launch
(file time 14:20:02Z, first launch 14:20:07Z) and not committed first; the
evidence README carries it verbatim.

The sentinel tier at the release head (`5bef46c`, merged, not yet tagged)
went 9 pass, 1 fail, 1 indeterminate on Claude Code 2.1.287. The fail was
`cost-checkbox-over-trigger`, which passed the 2026-09-30 sentinel on
2.1.284. The indeterminate (`triggering-test-driven-development`) was a
grader input failure, so it was re-run once as a side run. The human
partner treats a failed sentinel scenario as a regression and chose a paired
control before tagging. Decision rule: tag v6.15.0 if the treatment's pass
count is at least the control's; otherwise hold and report. Grader voids are
replaced (at most 3 per arm), setup voids relaunched, coding-agent failures
counted.

**Config.**
- **Scenario.** `cost-checkbox-over-trigger`, unchanged.
- **Arms.** Control: hyperpowers
  `0634a8ef0d734091be4d2e68b6e1c7af7b953947` (tag v6.14.0), a detached
  worktree made for the campaign. Treatment:
  `5bef46ceba1f3dfdbd817332a10c5fc9684f8287` (the release head), the
  primary checkout. 10 sessions each, run concurrently.
- **Side runs, not counted.** C: `triggering-test-driven-development` once
  at the treatment, the sentinel re-run. D: the scenario once at the
  treatment with `CLAUDE_CODE_ENABLE_TODO_TOOLS` removed from the launch
  environment, read only for its skill listing and task tools.
- **Harness.** This repository at `f6b13d56c`, clean.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`.
- **Batch.** Sentinel `batch-20261003T112329Z-71b3`, 11:23:29Z to 11:27:54Z.
  Paired arms and side runs launched 14:20:07Z to 14:20:12Z; last verdict
  14:33:26Z.
- **Clean run.** No grader voids, no setup voids, no replacements. Every
  launch record names its arm's root and `claude-opus-5-5`; every transcript
  reports 2.1.287. No file under either root's `skills/` or `hooks/` changed
  during the window.

**Run pointers.** `evidence/2026-10-03-release-6150-paired-control/`,
containing:
- `README.md`, with the pre-registration and the results;
- `manifest.tsv`;
- `archive-runs.sh`;
- `logs/`, with each launch's quorum output, the launch commands, the two
  window stamps, the pre-registration and `mutation-checks.txt`;
- `tally.py` and `tally.txt`;
- the run archives under `runs/control/`, `runs/treatment/`, `runs/side/`
  and `runs/sentinel/`.

**Verdict.** Tag. Control 0 of 10, treatment 0 of 10: the release head is
no worse than v6.14.0, and v6.15.0 was tagged on `5bef46c`. Neither arm can
pass this scenario on 2.1.287; 0 of 10 excludes pass rates above 26% per arm
(one-sided 95%). The sentinel stands at 10 of 11.
- **One failure mode.** All 20 counted sessions, and the sentinel's failure,
  called `Skill(hyperpowers:brainstorming)` as their first tool call. Every
  one failed only `skill-not-called(superpowers:brainstorming)`, and the
  grader judged each a fail on its own.
- **The listing changed.** On 2.1.287 every session's skill listing carries
  all 15 hyperpowers descriptions, brainstorming's "You MUST use this before
  any creative work" included. The 2026-09-30 pass on 2.1.284 had
  brainstorming as a bare name. The 2026-09-16 measurement
  (`2026-09-16-over-trigger-measurement`) moved only that description and
  took this scenario from 2 of 20 failures to 17 of 21.
- **Task tools are not the cause.** Side D had no task tools, still listed
  every description, and still called brainstorming first.
- **Side C passed.** It called test-driven-development first.
- **The repository instructions still reach sessions.** Every session here
  loaded `hyperpowers/AGENTS.md` and `hyperpowers/evals/AGENTS.md`, symlinks
  to the two repositories' `CLAUDE.md` files. The 2026-10-01 fix (`74d2482`)
  excludes `CLAUDE.md`, `CLAUDE.local.md` and `.claude/` instruction files,
  not `AGENTS.md`. AGENTS.md loads only where the fixture has no
  `CLAUDE.md` of its own, which also covers
  `2026-10-02-companion-over-trigger` and the four
  `2026-10-02-plans-component-library-*` campaigns. It is the same text the
  2026-09-30 run loaded as `CLAUDE.md`; that run also loaded the operator's
  global file, which no longer loads.

**Limits.**
- **The cause is not isolated in this campaign.** Both arms shared the
  environment. The listing attribution rests on the 2026-09-16 measurement,
  where the operator's global instructions reached both arms; whether their
  absence now adds to the failure rate is untested.
- **Floor effect.** At 0 of 10 in both arms, a release-head regression
  smaller than the environment's own effect cannot show.
- **AGENTS.md is not dated.** Every fixture without its own `CLAUDE.md` since
  the 2026-10-01 fix ran on 2.1.287, so whether the AGENTS.md load is new in
  2.1.287 or a fallback the exclude list exposes is not separated.
- **Task tools.** Every counted session inherited the operator's
  `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`.
- **Records.** The pre-registration was not committed before launch, and the
  control root's mutation check is transcribed from the operator session
  because that worktree was removed before archiving.
- **Scope.** One scenario, one model, one Claude Code version, n=10 per arm.

**Correction (2026-10-03).** The 0 of 10 floor belongs to the harness, not
to Claude Code 2.1.287. On the clean harness
(`2026-10-03-harness-confound-attribution`), v6.14.0 and v6.15.0 each passed
10 of 10 with brainstorming's description listed in every session. Loading
`AGENTS.md` again took v6.15.0 to 0 of 10. "Neither arm can pass this
scenario on 2.1.287" holds only with the repository instruction text loaded.
"The listing changed" is not the whole cause either: the description alone
passed 30 of 30. The verdict stands, since both arms shared the leak. Details
in the evidence README's Correction section.
