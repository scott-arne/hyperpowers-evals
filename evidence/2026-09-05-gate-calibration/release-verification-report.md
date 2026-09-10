# Release verification — full suite matrix

**Commit:** `1ab318c0a33eb3a06a1907eb1e0762554ef40d84` (`1ab318c`, branch `part2-gate-calibration`)
**Run:** 2026-09-09, from the repository root `/Users/johnss51/Development/agents/hyperpowers`
**Working tree at the time of the run:** `git status --short` printed nothing.
**Tag check:** `git rev-parse v6.14.0^{commit}` = `fa66b719967a0216123deae410ab8e7901e27f1f` (unchanged).

Every command is the plan's Task 10 Step 1 matrix, run at the final HEAD above.

| # | Command | Final line | Exit |
|---|---------|-----------|------|
| 1 | `bash tests/codex-review-gate/test-gate-split-lossless.sh` | `STATUS: PASSED` | 0 |
| 2 | `bash tests/codex-review-gate/test-gate-round.sh` | `ALL PASS` | 0 |
| 3 | `bash tests/codex-review-gate/test-gate-contract.sh` | `STATUS: PASSED` | 0 |
| 4 | `bash tests/codex-review-gate/test-gate-topology.sh` | `STATUS: PASSED` | 0 |
| 5 | `bash tests/codex-review-gate/test-verdict-normalize.sh` | `ALL PASS` | 0 |
| 6 | `bash tests/codex-review-gate/test-gate-telemetry.sh` | `ALL PASS` | 0 |
| 7 | `bash tests/packaging/test-no-orphan-skill-files.sh` | `STATUS: PASSED` | 0 |
| 8 | `bash tests/sdd/test-sdd-contract.sh` | `STATUS: PASSED` | 0 |
| 9 | `( cd tests/brainstorm-server && npm test )` | `--- Results: 7 passed, 0 failed ---` | 0 |
| 10 | `node tests/pi/test-pi-extension.mjs` | `ℹ duration_ms 32.307959` (tallies: `ℹ tests 6`, `ℹ pass 6`, `ℹ fail 0`) | 0 |

No suite failed. Suite 6 is the one this round changed; it grew ten assertions
covering the plan-workspace walk and the windowed task cohort and still ends
`ALL PASS`.

Additional check outside the matrix (not part of Task 10 Step 1):
`bash scripts/lint-shell.sh` — `Linting 2 shell files`, exit 0.
