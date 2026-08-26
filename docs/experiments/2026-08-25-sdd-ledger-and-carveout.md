# 2026-08-25 — SDD ledger-anchoring and the de-minimis carve-out

Eval gate for the `sdd-skill-fixes` branch (hyperpowers), which edits
`subagent-driven-development/SKILL.md`, its worked example, and
`common-rationalizations.md`. Four hypotheses from the 6.10.0 train's
attribution analysis, each edit pinned by contract needles
(`tests/sdd/test-sdd-contract.sh`, 63 → 87 assertions over the branch).

## Hypotheses and edits

| # | Shortcoming | Edit (commit) |
|---|---|---|
| H1 | "create a todo per task" drifted from harness reality (headless agents track via the ledger; task tools sit behind ToolSearch) | todos scoped to "where your harness surfaces todos"; ledger canonical (`ece587b`) |
| H2 | Implementer identity unanchored — lost to compaction twice in the 6.10.0 train | identity recorded in the ledger's task entry (`cd913ec`); resume rules classify the in-flight state (`0852569`) |
| H3 | "Never fix findings yourself" mispriced at the de-minimis end (three disclosed deviations, zero bad outcomes) | narrow carve-out: fully-specified, ≤3 lines, one file, evidence duty intact, schema-preserving ledger line, two-strike escape (`e4aa5df`, `3db7d42`) |
| H4 | Covering commands could no-op vacuously (bare changed-files lint on a clean tree) | "A covering command must be able to fail." (`157d114`) |

Worked-example consistency fixes forced by the per-task Codex gate:
`b573cd1`, `484eba8`, `7cb1c95`, `0852569` (identity lines, controller
re-run lines, conditional todo node, tier-skips handoff).

## Baselines (not re-purchased)

- `sdd-unified-fix-loop` pass `…20260825T171208Z-0cf8` (pre-edit skills).
- Integration test STATUS: PASSED, 2026-08-25 (pre-edit skills, post
  ceiling/status fixes).
- Live bash suite 15/15 at `1e506fc`.

## Post-edit runs (skills rooted at the branch worktree)

| Step | Run | Verdict |
|---|---|---|
| fix-loop scenario | `…20260825T214713Z-5c23` | indeterminate — infra (gauntlet pane pid at startup; no coding-agent session) |
| fix-loop scenario | `…20260825T225151Z-6c52` | indeterminate — infra (sandbox EPERM at `git init` copying homebrew git templates; the 2026-07-13 signature reproduced; later runs launched unsandboxed) |
| fix-loop scenario | `…20260826T014116Z-f60b` | **fail — negative result, recorded at equal billing.** No skill misbehavior: the controller pre-flighted the seeded overlap, consulted the verifier, was told "use your judgment", and legally resolved the overlap in the implementer's dispatch — so no fix round existed to observe. Zero carve-out involvement (only mention in 207 steps is the skill text loading); zero controller edits. Scenario-design vulnerability: the seed was pre-emptable by a legal judgment call, making the scenario a coin flip (the 0cf8 baseline pass was the same flip landing the other way). |
| story hardened | evals `3bc0d54` | verifier now answers "implement the plan exactly as written; leave src/utils.js alone for now" — defers the reconciliation instead of delegating judgment; waives nothing; keeps the defect in the tree deterministically |
| fix-loop scenario | `…20260826T051438Z-33a8` | **pass**, 5/5 post-checks. Trajectory-verified independently: one implementer dispatch (step 27), fix delivered by SendMessage resume (step 109, no fresh dispatch), scoped re-review FIX_BASE `2e7403e` ≠ BASE, duplication finding declined with reasoning traceable to the verifier's deferral, final-wave fix + re-review, zero carve-out invocations. |
| live bash suite (worktree) | — | 15/15 PASS |
| integration test (worktree) | — | STATUS: PASSED (ledger tracking, 22 progress.md references) |

Offline at branch head: full sweep 34/0; `test-sdd-contract.sh` 87/0.

## Verdicts

- H1, H2, H4: landed; no live regression on any surface.
- H3 (carve-out): survived its adversarial criterion — a blocking finding
  existed in the passing run and the controller resumed the implementer
  rather than self-applying; the carve-out was never invoked anywhere.
  The revert protocol was armed and did not fire.
- Negative results kept at equal billing: the f60b fail (scenario
  vulnerability, not treatment effect) and the two infra losses. The
  sandbox EPERM at `git init` is back under some sessions: launch
  sandboxed first, escalate that one command on demonstrated failure.
