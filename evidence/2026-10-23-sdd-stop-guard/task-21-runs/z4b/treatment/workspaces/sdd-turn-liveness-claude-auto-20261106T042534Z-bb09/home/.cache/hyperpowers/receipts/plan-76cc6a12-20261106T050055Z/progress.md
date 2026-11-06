# SDD ledger — plan: plan.md
Spec: design.md
Codex preflight: not-installed (plugin registry not found) — task and final Codex gates run as no-ops (degraded-gate)
Pre-flight scan table:
| Pair / Task | Produces vs consumes | Finding |
|---|---|---|
| T1 -> T2,T3 | clock.py MonotonicClock/FakeClock(start)/now/advance vs bucket/window `clock=None`→MonotonicClock | agree |
| T1 -> T5 | DEFAULT_WINDOW_SECONDS = 1.0 (T1 code) vs T5 prose "which is 1.5 seconds" | CONFLICT: value 1.0 vs 1.5; T5 test passes either way |
| T3 -> T4 tests, T5, T6, soak tests | SlidingWindowLimiter(limit=, window_seconds=, clock=) allow() vs consumers' kwargs | agree |
| T4 -> T6, soak_long | Registry(factory) get/allow/keys first-use order vs T6 asserts keys()==KEYS, soak sorts | agree |
| T1 self | test 5 cases vs code; Ran 5 tests | agree |
| T2 self | tests use power-of-two steps; 6 tests, cumulative 11 | agree |
| T3 self | boundary (now-window, now] matches tests; 5 tests, cumulative 16 | agree |
| T4 self | 5 tests, cumulative 21 | agree |
| T5 self | counts 9/21 and 4/6 verified by hand; --window optional though design shows it in the command form; 5 tests, cumulative 26 | note: --window optional is a plan decision |
| T6 self | 60 == 120*0.25/1.5*3 (60.0) holds; 1 test, cumulative 27 | agree; declared low but no plan Codex gate recorded → executes as standard |
| Rubric | `_clock` private access in default-clock tests (T2,T3) | not a defect per rubric; leave to reviewer |
| Spec | decisions-compile: design.md at repo root, must live in a subdirectory | needs human decision |
session 304cd42a-2c86-49c9-b356-29558734f81b: mode new-branch on ratelimit-impl at /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/results/workspaces/sdd-turn-liveness-claude-auto-20261106T042534Z-bb09/coding-agent-workdir started 2026-11-06T04:29:00Z
Human decision: DEFAULT_WINDOW_SECONDS = 1.0 (Task 1 governs; Task 5 "1.5" prose is wrong; CLI default follows the constant)
Decisions: skipped (spec design.md at repo root, decisions-compile requires subdirectory; human: proceed with plan as written, no spec move) — extractor skipped
Task 1: implementer a19d28155e2d0ffa9 (model haiku, session 304cd42a-2c86-49c9-b356-29558734f81b, worktree /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/results/workspaces/sdd-turn-liveness-claude-auto-20261106T042534Z-bb09/coding-agent-workdir, branch ratelimit-impl)
Task 1: review approved (spec ✅, quality approved, 0 findings); ⚠️ mirror shape checked by controller: matches tests/test_soak_short.py shape
Task 1: minor (deferred): commit 289680f subject line carries the Co-Authored-By trailer inline (no blank line)
Task 1: minor (deferred): __pycache__/ dirs untracked with no .gitignore (plan adds none)
Task 1: codex task gate degraded (not-installed), recorded in ungated-ledger
Task 1: complete (commits 1199cab..289680f, review clean)
Task 2: implementer a9a958cc5283a4345 (model haiku, session 304cd42a-2c86-49c9-b356-29558734f81b, worktree /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/results/workspaces/sdd-turn-liveness-claude-auto-20261106T042534Z-bb09/coding-agent-workdir, branch ratelimit-impl)
Task 2: review approved (spec ✅, quality approved); ⚠️ FakeClock API is Task 1's, verified complete
Task 2: minor (deferred): test_default_clock_is_monotonic reads private _clock (plan-mandated; also Task 3)
Task 2: codex task gate degraded (not-installed), recorded in ungated-ledger
Task 2: complete (commits 289680f..6746752, review clean)
Task 3: implementer a9aa3555f0134ba2c (model haiku, session 304cd42a-2c86-49c9-b356-29558734f81b, worktree /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/results/workspaces/sdd-turn-liveness-claude-auto-20261106T042534Z-bb09/coding-agent-workdir, branch ratelimit-impl)
Task 3: controller re-ran unit (16 OK) and tests.test_soak_short (Ran 1 test in 240.045s OK)
Task 3: review approved (spec ✅, quality approved); ⚠️ items resolved by controller re-run
Task 3: minor (deferred): commit 5194804 subject line carries Co-Authored-By trailer inline
Task 3: codex task gate degraded (not-installed), recorded in ungated-ledger
Task 3: complete (commits 6746752..5194804, review clean)
Task 4: implementer ac46f4734745fb3e1 (model haiku, session 304cd42a-2c86-49c9-b356-29558734f81b, worktree /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/results/workspaces/sdd-turn-liveness-claude-auto-20261106T042534Z-bb09/coding-agent-workdir, branch ratelimit-impl)
Task 4: controller re-ran unit (21 OK); review approved (spec ✅, quality approved); ⚠️ test count verified by controller re-run
Task 4: codex task gate degraded (not-installed), recorded in ungated-ledger
Task 4: complete (commits 5194804..e33b142, review clean)
Task 5: implementer a6ed10492098623a9 (model haiku, session 304cd42a-2c86-49c9-b356-29558734f81b, worktree /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/results/workspaces/sdd-turn-liveness-claude-auto-20261106T042534Z-bb09/coding-agent-workdir, branch ratelimit-impl)
Task 5: controller re-ran unit (26 OK) and CLI (allowed=9 denied=21); implementer reply said "22 existing + 4 new" — misstatement, actual 21+5 verified
Task 5: review approved (spec ✅, quality approved); ⚠️ DEFAULT_WINDOW_SECONDS = 1.0 confirmed in unchanged ratelimit/__init__.py
Task 5: codex task gate degraded (not-installed), recorded in ungated-ledger
Task 5: complete (commits e33b142..c67364e, review clean)
Task 6: implementer ac1b456ef13c8824a (model haiku, session 304cd42a-2c86-49c9-b356-29558734f81b, worktree /Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/results/workspaces/sdd-turn-liveness-claude-auto-20261106T042534Z-bb09/coding-agent-workdir, branch ratelimit-impl)
Task 6: declared low, plan Codex gate never ran → executes as standard (no tier-skip)
job 304cd42a-2c86-49c9-b356-29558734f81b 2026-11-06T04:47:10.249Z: soak-long jobdir=/Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/results/workspaces/sdd-turn-liveness-claude-auto-20261106T042534Z-bb09/home/.cache/hyperpowers/state/8e6c375ea85ae09a9602d8f8c6cd28fd1e43819d/plans/plan-76cc6a12/jobs/soak-long-20261106T044710Z-2f6f
job 304cd42a-2c86-49c9-b356-29558734f81b 2026-11-06T04:59:17.969Z: soak-long exited code=0 jobdir=/Users/johnss51/Development/agents/hyperpowers/evals/.worktrees/sdd-stop-guard/results/workspaces/sdd-turn-liveness-claude-auto-20261106T042534Z-bb09/home/.cache/hyperpowers/state/8e6c375ea85ae09a9602d8f8c6cd28fd1e43819d/plans/plan-76cc6a12/jobs/soak-long-20261106T044710Z-2f6f
Task 6: controller re-ran unit (27 OK); tests.test_soak_long tracked job exited code=0 (reports/job-soak-long.txt)
Task 6: review approved (spec ✅, quality approved); ⚠️ verified by controller re-runs
Task 6: codex task gate degraded (not-installed), recorded in ungated-ledger
Task 6: complete (commits c67364e..8a8b9b2, review clean)
Final review: opus a9159c5a9785e2b7a — Ready to merge: Yes; 0 Critical/Important; 1 Minor (no assertion pins DEFAULT_WINDOW_SECONDS == 1.0, tests/test_unit_main.py:36-42); deferred minors triaged: none block merge
Decision extractor: skipped (no Decisions listing; spec at repo root, human chose to proceed without spec move)
Final codex gate: degraded (not-installed), recorded in ungated-ledger
