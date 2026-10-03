# Harness-Confound Attribution for the Over-Trigger Floor (2026-10-03)

Pre-registered before the first counted session. The rule below was written
to the operator's scratch directory at 18:24:24Z, its sha256 recorded at
18:24:42Z (`logs/pre-launch.txt`), and the four arms launched at 18:27:47Z.
It is copied here unchanged (`logs/preregistration.txt`). As in the paired
control, it was not committed before launch, so its timing rests on the
file's mtime, the recorded hash and the operator session's transcript.

## Question

The 2026-10-03 paired control (`../2026-10-03-release-6150-paired-control/`)
put `cost-checkbox-over-trigger` at 0 of 10 for v6.14.0 and v6.15.0 alike on
Claude Code 2.1.287. Its sessions also carried two harness leaks found
afterwards:

- **Repository instructions.** Every session loaded `hyperpowers/AGENTS.md`
  and `hyperpowers/evals/AGENTS.md`, symlinks to the two repositories'
  `CLAUDE.md` files. The 2026-10-01 exclude list did not cover `AGENTS.md`.
  Fixed in `fc42537c5`.
- **The operator's environment.** The launcher passed the operator session's
  Claude environment through to the agent under test, including
  `CLAUDE_CODE_ENTRYPOINT=sdk-ts`, the task-tools opt-in and the model alias
  pins. Fixed in `be020f0d0`, which drops every inherited `CLAUDE*` and
  `ANTHROPIC*` variable before the env-file is sourced.

One session on the fixed harness passed (pilot `3d43`). The question: was
the 0 of 10 a harness artifact, and if so, which leak drove it? The answer
decides hyperpowers BACKLOG item 1, the brainstorming over-trigger.

## Pre-registration

Verbatim from `logs/preregistration.txt`:

```
Pre-registration: 2026-10-03 harness-confound attribution for the over-trigger floor

Background. The 2026-10-03 paired control (evidence/2026-10-03-release-6150-paired-control)
put cost-checkbox-over-trigger at 0 of 10 for both v6.14.0 and v6.15.0 on Claude
Code 2.1.287; every session called Skill(hyperpowers:brainstorming) first. Those
sessions loaded hyperpowers/AGENTS.md and evals/AGENTS.md and inherited the
operator session's Claude env, including CLAUDE_CODE_ENTRYPOINT=sdk-ts. Harness
commits fc42537c5 (AGENTS.md excluded) and be020f0d0 (clean launcher env)
remove both. One run on the fixed harness passed
(cost-checkbox-over-trigger-claude-auto-20261003T180729Z-3d43, not counted).

Questions and rules. Every comparison is a two-sided Fisher exact test on pass
counts; "separated" means p < 0.05.
  Q1  Was the 0 of 10 a harness artifact? Arm A against the paired-control
      treatment (0 of 10, same root 5bef46c, same Claude Code version, harness
      f6b13d56c with both leaks).
  Q2  Do the versions differ on the clean harness? Arm A against arm B.
  Q3  Which leak drives the over-trigger? Arm C against A, and arm D against A.
      A leak drives it when its arm is separated below A.

What follows for hyperpowers BACKLOG item 1 (the brainstorming over-trigger):
  - A not separated from 0 of 10: the over-trigger is real in a clean session;
    item 1 proceeds, measured on the clean harness.
  - A separated and C separated below A: item 1 proceeds, measured with the
    sdk-ts entrypoint, because the operator's own sessions run as sdk-ts.
  - A separated, D separated below A, C not: the trigger came from the
    repository instruction text; item 1 closes as a harness artifact.
  - A separated, neither C nor D separated: the old floor needs both leaks
    together or another inherited variable; no item 1 decision, follow-up
    proposed.

Config.
  Scenario   cost-checkbox-over-trigger, unchanged.
  Model      claude-opus-5-5 via claude-auto, Claude Code 2.1.287, default
             listing budget; Gauntlet-Agent on claude-opus-5-5 (host
             GAUNTLET_AGENT_MODEL).
  Arm A      hyperpowers 5bef46ceba1f3dfdbd817332a10c5fc9684f8287 (v6.15.0,
             primary checkout); evals be020f0d0 (primary clone, clean).
  Arm B      hyperpowers 0634a8ef0d734091be4d2e68b6e1c7af7b953947 (v6.14.0,
             detached worktree .cache/hyperpowers/harness-attr/hp-6140);
             evals be020f0d0 (primary clone).
  Arm C      hyperpowers 5bef46c; evals 5f2bc248e (branch
             attr/entrypoint-sdk-ts: be020f0d0 plus CLAUDE_CODE_ENTRYPOINT=sdk-ts
             on the launcher's exec line), worktree
             .cache/hyperpowers/harness-attr/evals-entrypoint.
  Arm D      hyperpowers 5bef46c; evals 50858a29d (branch attr/agents-md-loaded:
             be020f0d0 with fc42537c5 reverted), worktree
             .cache/hyperpowers/harness-attr/evals-agentsmd.
  Results    every arm writes to the primary clone's results/ (--out-root), so
             each run directory has the same ancestors as the paired control's.
  Launch     four `quorum run cost-checkbox-over-trigger --coding-agent
             claude-auto --repeat 10` processes, concurrent, outside the
             operator's command sandbox; 10 sessions per arm.

Voids. A grader exit without a result is void and replaced, at most 3 per arm.
A harness setup failure is void and relaunched. A coding-agent failure is a
trial.

Manipulation checks, read per run from the launch record and the main
transcript: plugin root and model in the launch record; Claude Code version;
entrypoint (A, B, D: cli; C: sdk-ts); instruction files loaded (A, B, C: none;
D: hyperpowers/AGENTS.md and evals/AGENTS.md); task tools offered (none in any
arm); whether the listing carries the brainstorming description; first tool
call. A run that fails its arm's manipulation check is reported and excluded
from the counts.

Mutation check. git status of skills/ and hooks/ in both hyperpowers roots, and
HEAD plus status of the three evals trees, before launch and after the last
verdict.

Known limits, stated before launch.
  - The fourth corner (both leaks) is the paired control's treatment: earlier
    the same day, harness f6b13d56c, and its inherited env also carried the
    task-tools opt-in and other session variables.
  - Arm C restores only the entrypoint, not the other inherited identity
    variables (CLAUDECODE was stripped then too; CLAUDE_CODE_CHILD_SESSION,
    the session id and the messaging socket are not restored).
  - n = 10 per arm, one scenario, one model, one Claude Code version.
```

## Config

- **Arms.** As pre-registered. The arm C and arm D harness branches stay
  local to the operator's clone; their full diffs against `be020f0d0` are
  `logs/arm-c-launcher.patch` (one line: the exec line gains
  `CLAUDE_CODE_ENTRYPOINT=sdk-ts`) and `logs/arm-d-revert.patch` (the revert
  of `fc42537c5`).
- **Model and grader.** `claude-opus-5-5` through `claude-auto`, Claude Code
  2.1.287, default listing budget. The Gauntlet-Agent graded on
  `claude-opus-5-5`.
- **Window.** A first launch at 18:25:22Z to 18:25:30Z put bun's `--cwd`
  before `run`. bun printed its usage text and exited 0 in all four arms, and
  no run directory was created. All four arms relaunched at 18:27:47Z and ran
  concurrently; the last verdict landed at 18:41:32Z.
- **Launch commands.** `logs/launch-commands.txt`, transcribed from the
  operator session.

## Results

`./tally.py` prints every row, the counts, the three tests and the outcome
(`tally.txt`).

| Arm | Condition | Root | Pass | Fail | Void |
|---|---|---|---|---|---|
| A | clean harness | v6.15.0 | 10 | 0 | 0 |
| B | clean harness | v6.14.0 | 10 | 0 | 0 |
| C | clean, entrypoint `sdk-ts` | v6.15.0 | 10 | 0 | 0 |
| D | clean, AGENTS.md loaded | v6.15.0 | 0 | 10 | 0 |

| Question | Comparison | p (two-sided Fisher) | Separated |
|---|---|---|---|
| Q1 | A 10/10 vs paired-control treatment 0/10 | 1.08e-05 | yes |
| Q2 | A 10/10 vs B 10/10 | 1 | no |
| Q3 | C 10/10 vs A 10/10 | 1 | no |
| Q3 | D 0/10 vs A 10/10 | 1.08e-05 | yes, below A |

**Outcome: item 1 closes as a harness artifact.** A is separated from the
paired control's 0 of 10, D is separated below A, and C is not. On this
scenario and on 2.1.287, the over-trigger needs the repository instruction
text.

- **The listing alone is not sufficient.** Every one of the 40 sessions had a skill
  listing carrying brainstorming's full description ("You MUST use this
  before any creative work"). With the instruction files absent (A, B, C),
  30 of 30 passed. Each one's first tool call was `Bash`, and none of them
  called a skill. With them present (D), 10 of 10 called
  `Skill(hyperpowers:brainstorming)` first, classified the request as bounded,
  and stopped for approval. That is the paired control's failure mode.
- **The versions do not differ on the clean harness.** v6.14.0 and v6.15.0
  both passed 10 of 10.
- **The entrypoint does not matter here.** C ran with `sdk-ts` in every
  transcript and passed 10 of 10.
- **The manipulation checks held.** Every session's launch record named its
  arm's root and `claude-opus-5-5`. Every transcript reported 2.1.287 and no
  task tools. A, B and D reported entrypoint `cli` and C `sdk-ts`. A, B and C
  loaded no instruction file, and D loaded exactly
  `hyperpowers/AGENTS.md` and `hyperpowers/evals/AGENTS.md`. No run was
  excluded.
- **Clean run.** No grader voids, no setup voids, no replacements.
- **Mutation checks.** Both roots' HEADs and the three evals trees' HEADs
  were the same before launch and after the last verdict
  (`logs/pre-launch.txt`, `logs/post-run.txt`). `skills/` and `hooks/` were
  clean in both roots throughout. All three evals trees were clean before
  launch. After the run, the primary evals clone's only status entry was
  this directory, which holds the write-up and no harness code.
- **The pilot agrees.** Run `3d43`, the one session before the campaign, on
  the uncommitted working tree that became `fc42537c5` and `be020f0d0`,
  passed the same way (`runs/pilot/`).

## Limits

- **Which file primes is not separated.** D loaded both repository files
  together, and no D session's visible text cites either. The hyperpowers
  `CLAUDE.md` says a working integration "auto-triggers the `brainstorming`
  skill before any code is written". That is a plausible primer, but it is
  untested here.
- **One scenario.** The clean-harness result covers `cost-checkbox-over-trigger`
  only. Other over-trigger and boundary scenarios measured under either leak
  need their own clean measurement before their numbers are reused.
- **The description's share is untested.** No arm had the instruction text
  without the description, so this campaign cannot say whether the failure
  needs both. The 2026-09-30 sentinel run on 2.1.284 loaded the same
  repository text with brainstorming as a bare name, and passed. That points
  to an interaction, but it is one run on another version.
- **Earlier measurements carry the same text.** From
  `2026-09-17-first-edit-interlock` (Claude Code 2.1.276) until `74d2482`
  (2026-10-01), every archived claude transcript loaded the two repository
  `CLAUDE.md` files and the operator's global file. From `74d2482` until
  `fc42537c5`, fixtures without a `CLAUDE.md` of their own loaded the same two
  files as `AGENTS.md`. Transcripts on 2.1.261, which include the 2026-09-16
  over-trigger measurement, record no instruction files. So whether those
  sessions loaded them cannot be read.
- **The text is not only in the harness.** The human partner's own sessions
  inside the hyperpowers repository load the same `CLAUDE.md`, so the
  condition arm D measured holds there. Closing item 1 as a harness artifact
  says nothing about those sessions.
- **The fourth corner is historical.** Both leaks together is the paired
  control's treatment: an earlier window, harness `f6b13d56c`, and other
  inherited variables.
- **Arm C restores only the entrypoint** (see the pre-registration).
- **Pre-registration timing.** Written to scratch and hashed, not committed,
  before launch (see the top of this file).
- **Scope.** One scenario, one model, one Claude Code version, n=10 per arm.

## Files

- `logs/preregistration.txt`: the rule above, verbatim.
- `logs/pre-launch.txt`, `logs/post-run.txt`: the pre-registration's hash and
  the mutation check readouts, before launch and after the last verdict.
- `logs/launch-commands.txt`: every launch, with its UTC time, including the
  discarded first launch and the pilot.
- `logs/launch-times.txt`: the UTC time of each launch, the discarded first
  launch included.
- `logs/arm-a-clean-6150.out`, `logs/arm-b-clean-6140.out`,
  `logs/arm-c-entrypoint.out`, `logs/arm-d-agentsmd.out`: quorum's output for
  each arm.
- `logs/live-verify-1.log`, `logs/live-verify-2.log`: the pilot's sandboxed
  setup void and its pass.
- `logs/arm-c-launcher.patch`, `logs/arm-d-revert.patch`: the arm C and arm D
  harness diffs against `be020f0d0`.
- `manifest.tsv`: commits, model, and each arm's scenario, repeat count and
  condition.
- `archive-runs.sh`: copied the runs from `results/` and stripped them.
- `tally.py`, `tally.txt`: the per-run readouts, the tests and the outcome.
- `runs/a-clean-6150/`, `runs/b-clean-6140/`, `runs/c-entrypoint/`,
  `runs/d-agentsmd/`: the 40 counted runs.
- `runs/pilot/`: run `3d43`.
