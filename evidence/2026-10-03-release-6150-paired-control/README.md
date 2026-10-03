# v6.15.0 Release: Paired Control for the Over-Trigger Sentinel Failure (2026-10-03)

Pre-registered before the first paired session. The rule below was written to
the operator's scratch directory at 14:20:02Z, five seconds before the first
launch, and copied here unchanged (`logs/paired-preregistration.txt`). Unlike
earlier campaigns, it was not committed before launch, so its timing rests on
the file's mtime and the operator session's transcript, not on a commit.

## Question

The sentinel tier at the release head (hyperpowers `5bef46c`, merged and not
yet tagged) went 9 pass, 1 fail, 1 indeterminate on 2026-10-03 (batch
`batch-20261003T112329Z-71b3`, `logs/sentinel-run-all.out`). The fail was
`cost-checkbox-over-trigger`: the agent called brainstorming as its first
action on a request that should not trigger it. The same scenario passed the
2026-09-30 sentinel on Claude Code 2.1.284
(`../2026-09-23-adoption-remediation/task-17-sentinel-runs/`); this batch ran
on 2.1.287.

The human partner treats a failed sentinel scenario as a regression to
investigate, and chose a paired control before tagging. The question: is the
failure the release's, or the environment's? If v6.14.0, the last tag, fails
the same scenario as often on the same Claude Code, the release head is no
worse.

## Pre-registration

Verbatim from `logs/paired-preregistration.txt`:

```
Paired control for the v6.15.0 sentinel failure (2026-10-03). Written before launch.

Arms (scenario cost-checkbox-over-trigger, claude-auto, --repeat 10, run concurrently):
  A control:   SUPERPOWERS_ROOT=/Users/johnss51/.cache/hyperpowers/release-6150/hp-6140 (v6.14.0, 0634a8e)
  B treatment: SUPERPOWERS_ROOT=/Users/johnss51/Development/agents/hyperpowers (main, 5bef46c)
Side runs (not counted in either arm):
  C triggering-test-driven-development x1 at 5bef46c (void replacement for run 0176)
  D cost-checkbox-over-trigger x1 at 5bef46c with CLAUDE_CODE_ENABLE_TODO_TOOLS removed
    from the launch env; read only for its skill_listing and task tools.
Decision rule: tag v6.15.0 if B's pass count >= A's pass count. If B < A, hold the
release and report to the human partner, who decides.
Void rule (eval-void-attempt-rule): grader exit without a result -> void, replaced,
at most 3 replacements per arm; harness setup failure -> void, relaunched, no cap.
A coding-agent failure is a trial and is not replaced.
Mutation check: no file under either root's skills/ or hooks/ newer than the window start.
```

Side run C replaces sentinel run `0176`, which ended indeterminate because
the grader's input tool garbled the scenario's prompt (its summary: the first
attempt sent only the first line, the second dropped the closing request). That
is an instrument failure, not a trial, so the sentinel's one-rerun rule
applies. The pre-registration's parenthetical calls it a void replacement.

## Config

- **Arms.** Control: hyperpowers `0634a8ef0d734091be4d2e68b6e1c7af7b953947`
  (tag v6.14.0), from a detached worktree made for this campaign. Treatment:
  `5bef46ceba1f3dfdbd817332a10c5fc9684f8287` (the release head, later tagged
  v6.15.0), from the primary checkout.
- **Harness.** This repository at `f6b13d56c`, clean.
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`.
- **Window.** All four launches started 14:20:07Z to 14:20:12Z and ran
  concurrently; the last verdict landed at 14:33:26Z.
- **Launch commands.** `logs/launch-commands.txt`, transcribed from the
  operator session.

## Results

`./tally.py` prints every row and the decision (`tally.txt`).

| Arm | Root | Pass | Fail | Void |
|---|---|---|---|---|
| Control | v6.14.0 | 0 | 10 | 0 |
| Treatment | 5bef46c | 0 | 10 | 0 |

**Decision: tag.** The treatment's pass count (0) is not below the control's
(0). v6.15.0 was tagged on `5bef46c` and pushed the same day.

- **Every session failed the same way.** All 20 counted sessions called
  `Skill(hyperpowers:brainstorming)` as their first tool call. In each, the
  only failed check was `skill-not-called(superpowers:brainstorming)`, and
  the grader independently judged fail. The sentinel failure (`7629`) is the
  same.
- **Clean run.** No voids in either arm, no replacements. Every session's
  launch record names its arm's root and `claude-opus-5-5`; every transcript
  reports Claude Code 2.1.287.
- **Mutation checks.** No file under either root's `skills/` or `hooks/` was
  newer than the window start (`logs/mutation-checks.txt`).
- **Side C passed.** The TDD re-run called test-driven-development first and
  passed, so the sentinel stands at 10 of 11.
- **Side D failed the same way.** With `CLAUDE_CODE_ENABLE_TODO_TOOLS`
  removed from the launch environment, the session had no task tools, its
  listing still carried every hyperpowers description, and it called
  brainstorming first.

### What changed between 2.1.284 and 2.1.287

Read from the transcripts (`tally.txt`, plus the 2026-09-30 sentinel's
`cost-checkbox-over-trigger` run `ee5e`):

- **The skill listing.** On 2.1.284 the brainstorming entry was a bare name.
  On 2.1.287 every session's listing carries all 15 hyperpowers descriptions,
  brainstorming's "You MUST use this before any creative work" included.
  Side D shows the task-tools opt-in is not the cause. The 2026-09-16
  measurement (`../2026-09-16-over-trigger-measurement/`) found that
  description, once listed, raised this scenario's failure rate from 2 of 20
  to 17 of 21.
- **The instruction files.** Every session here loaded
  `hyperpowers/AGENTS.md` and `hyperpowers/evals/AGENTS.md` as project
  instructions. Both are symlinks to the repositories' `CLAUDE.md` files,
  and both have been tracked for months. The 2026-10-01 harness fix
  (`74d2482`) excludes `CLAUDE.md`, `CLAUDE.local.md`, `.claude/CLAUDE.md`
  and `.claude/rules/` for each ancestor, not `AGENTS.md`. The 2026-09-30
  run loaded the same two repository files under their `CLAUDE.md` names,
  plus the operator's global file, which the fix now excludes. The
  repository instruction text the agent sees is therefore unchanged; the
  global file's absence is the difference.
- **When AGENTS.md loads.** Across this month's runs in `results/`, the
  AGENTS.md files load only in sessions whose fixture has no `CLAUDE.md` of
  its own. Since the fix, where the fixture has one, it is the only
  instruction file loaded, on 2.1.284 and 2.1.287 alike. Every fixture
  without one since the fix ran on 2.1.287, so whether the AGENTS.md load
  is new in 2.1.287 or a fallback the exclude list exposes is not
  separated.

## Limits

- **The cause is not isolated here.** Both arms shared the environment, so
  the paired control answers only "is the release head worse?". That the
  listing drives the failure rests on the 2026-09-16 measurement, where the
  description was the only variable and the operator's global instructions
  reached both arms. Whether the global file's absence adds to the rate is
  untested.
- **Floor effect.** Both arms at 0 of 10 cannot show a release-head
  regression smaller than the environment's own effect. A difference would
  need a condition where the scenario passes.
- **The instruction files are a harness defect.** The repository
  instructions reaching eval sessions is the leak the 2026-10-01 fix was
  meant to close. It holds equally in both arms here. It also holds in the
  2026-10-02 campaigns whose fixtures carry no `CLAUDE.md`: every session in
  `../2026-10-02-companion-over-trigger/` and in the four
  `../2026-10-02-plans-component-library-*/` directories loaded both files.
- **Pre-registration timing.** Written to scratch, not committed, before
  launch (see the top of this file).
- **Control-root mutation check.** The control worktree was removed before
  archiving, so its check is transcribed from the operator session rather
  than re-run (`logs/mutation-checks.txt`).
- **Task tools.** Every counted session inherited the operator's
  `CLAUDE_CODE_ENABLE_TODO_TOOLS=1`; only side D ran without it.
- **Scope.** One scenario, one model, one Claude Code version, n=10 per arm.

## Files

- `logs/paired-preregistration.txt`: the rule above, verbatim.
- `logs/launch-commands.txt`: every launch, with its UTC time.
- `logs/batch-window-start.txt`, `logs/paired-window-start.txt`: the window
  starts the mutation checks compare against.
- `logs/mutation-checks.txt`: both roots' checks and their results.
- `logs/sentinel-run-all.out`, `logs/arm-a-v6140.out`,
  `logs/arm-b-5bef46c.out`, `logs/side-c-tdd.out`,
  `logs/side-d-notodo.out`: quorum's output for each launch.
- `manifest.tsv`: commits, model, and each arm's scenario and repeat count.
- `archive-runs.sh`: copied the runs from `results/` and stripped them.
- `tally.py`, `tally.txt`: the per-run readouts and the decision.
- `runs/control/`, `runs/treatment/`: the 20 counted runs.
- `runs/side/`: side runs C (`8395`) and D (`6439`).
- `runs/sentinel/`: the sentinel's failure (`7629`) and indeterminate
  (`0176`).

## Correction (2026-10-03)

Three readings above do not hold on a clean harness.
`../2026-10-03-harness-confound-attribution/` re-ran this scenario after
`fc42537c5`, which excludes `AGENTS.md`, and `be020f0d0`, which gives the
agent under test a clean Claude environment. v6.14.0 and v6.15.0 each
passed 10 of 10, and every session listed brainstorming's full description.
Putting back only the `AGENTS.md` load took v6.15.0 to 0 of 10, failing
the way this campaign's sessions did. Putting back only the `sdk-ts`
entrypoint left it at 10 of 10.

- **The floor is the instruction text's.** "Neither arm can pass this
  scenario on 2.1.287" holds only while the repository instruction text is
  loaded. Without it, both versions pass.
- **The listing is not the whole cause.** "What changed between 2.1.284 and
  2.1.287" puts the difference on the listing, with the repository text the
  same in both windows. On 2.1.287 the listed description passed 30 of 30
  without that text. Together with the 2026-09-30 pass, which had the text
  and a bare name, the record fits a failure that needs both. No run
  on 2.1.287 has the text without the description.
- **The 2026-09-16 measurement cannot be read for the global file.** The
  first Limit says the operator's global instructions reached both of its
  arms. It ran on 2.1.261, whose transcripts record no instruction files
  (`2026-10-01-companion-baseline` in the experiment log), so that cannot be
  read from them.

The pre-registered text above stays as committed, and the decision stands:
both arms ran under the same leak, and on the clean harness they are again
equal.
