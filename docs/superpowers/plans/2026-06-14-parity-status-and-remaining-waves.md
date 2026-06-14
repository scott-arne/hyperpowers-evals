# ATIF graft + TS↔Python parity — status & remaining plan (RESUME DOC)

> Written 2026-06-14 to survive a context compaction. If you're resuming cold, read this top-to-bottom first. It captures branch state, what's merged, the in-flight Wave 2b, the remaining Wave 3, the review/finish steps, and the conventions every wave follows.

## TL;DR
Two stacked branches off `origin/main` (Matt's TS rewrite of the `quorum` eval harness, which still carries the Python original):
- **`atif-graft`** — the ATIF graft: purge Python, make ATIF v1.7 the canonical transcript (`trajectory.json`), replace the 13 `bin/` trace tools with one `check-transcript` CLI, + cleanup. Converged & green, its own PR. ~27 commits over main.
- **`ts-python-parity`** (branched off `atif-graft`) — closes the TS-vs-Python parity gaps from `~/2026-06-14-ts-python-parity-punchlist.md` (147 findings). **75 fixes merged so far** (Wave 1 + Wave 2a), gate green. **Wave 2b (the runner) is IN FLIGHT.**

Ground truth for "is X a real parity gap" = the **flat-JSONL Python frozen on `origin/main`** (`git show origin/main:quorum/<f>.py`), NOT the ATIF Python on other branches.

## Branches & worktrees
- `origin/main` — Matt's TS rewrite (`src/`) + the frozen Python (`quorum/`, `setup_helpers/`). The parity target.
- `atif-graft` @ `21f1a8a` — checked out at the MAIN session worktree `…/evals/.claude/worktrees/atif-graft`. Pushed. Its own PR (ATIF graft + purge + cleanup).
- `ts-python-parity` @ `c06a51d` (at write time) — checked out at the nested worktree `…/evals/.claude/worktrees/atif-graft/.claude/worktrees/parity`. Pushed. Do parity merges/commits HERE.
- `feat/atif-port` — the original ATIF port (under `ts/`); REFERENCE ONLY for heavy module ports (`git show feat/atif-port:ts/src/quorum/<x>.ts`). Untouched.
- Gates (run in the parity worktree): `bun run check` (biome+tsc+test) and `bun run quorum check`. Baseline at write time: **795 pass / 0 fail, 55 scenarios ok.**

## DONE
- **ATIF graft** (`atif-graft`): purge Python, ATIF capture (`trajectory.json` + multi-log carry-forward merge), `check-transcript <verb>` CLI (13 verbs), composer guard, converged via 2 review rounds (629 pass).
- **Wave 1** (28 fixes): leaf subsystems — normalizers, checks, cli, run-all, scaffold, setup-helpers.
- **Wave 2a** (47 fixes): all 8 agent provisioning modules (codex/gemini/copilot/claude/kimi/opencode/antigravity/pi) + capture/obol detectors + session `duration_ms` + economics. Heavy module ports (opencode-capture, agy-creds/teardown/watch, kimi sanitization, timing) cribbed from `feat/atif-port`. Exported building blocks for the runner (e.g. `writePrivateFileNoFollow`, `scanCopilotSecretLeaks`, opencode snapshot/export, agy modules, misplaced-session detectors).
- Fix commits: `git log --oneline origin/main..origin/ts-python-parity` (messages `fix(parity): <ID> …`).

## IN FLIGHT — Wave 2b (the runner)
- Background agent **`a5cdffb2043afd91e`** is implementing it in an isolated worktree off `origin/ts-python-parity`; it pushes branch **`p2b-runner`** and returns a structured summary.
- Scope: `src/runner/index.ts` + integration glue (O_NOFOLLOW swaps in gemini/copilot/`index.ts` ClaudeAgent; `H-kimi-batch-preflight` in `src/run-all/index.ts`). It wires every Wave-2a building block + the A-core findings: REGION 1 early guards (missing-checks→setup-indeterminate, directive gating on single-run, story.md, binary preflight, launch-cwd existence, unknown-agent-yaml), REGION 2 gauntlet result tolerance (parse/exit/status/run-id/discover-malformed), REGION 3 per-agent wiring (copilot env-allowlist + secret-scan + session-id; **opencode snapshot/export = the one CRITICAL**; antigravity watcher/creds/launch-cwd-prep/settings), REGION 4 post-capture cascade (per-normalizer strict-capture indeterminate reasons + misplaced-session detectors + kimi session-start), REGION 5 economics crash-guard + kimi batch preflight.
- **TO RESUME if the notification was lost:** check `git ls-remote --heads origin p2b-runner`. If present, the agent finished — CHECK it (read the diff vs `origin/ts-python-parity`, re-run both gates in a worktree, scrutinize the opencode orchestration + the capture cascade + the antigravity invoke-gauntlet wiring, grep-verify the claimed wiring against the code), then merge `origin/p2b-runner` into `ts-python-parity`, re-gate, push. The runner is the operational heart — check hard; much of it is mock-gauntlet-tested, not live.

## WAVE 3 — the 6 net-new LOW findings (from the colleague reconciliation, `~/2026-06-14-reconciled-missing-findings.md`)
All LOW, all in the agent-config loader + runner lifecycle. In scope ("everything except cosmetic"). Strict red-green TDD.
- **RX-1** — validate `runtime_family` against the known set (`src/contracts/agent-config.ts`); unknown family currently falls through to `DefaultAgent` silently. Python rejects.
- **RX-2** — claude `model` required + reject blank (avoid `claude --model ''`).
- **RX-3** — `name == file-stem` check on load.
- **RX-4** — `required_env` load-time missing-key rejection (runtime presence check still exists, so narrow).
- **RX-5** — `substituteEnv` handles only `${VAR}`; add bare `$VAR` + leading `~` expansion (Python uses `string.Template` + `expanduser`). Find `substituteEnv` (agent-config / env).
- **RX-6** — runner `cleanup_dirs` + cleanup-failure→indeterminate `finally` (kimi secret-env temp dir never reaped; kimi fix commit `bc198d1` deferred it to the runner). **First check whether Wave 2b's runner agent already did this** — if so, RX-6 is done.
- Borderline (NOT counted, skip unless asked): `run-dir-collision-tolerance` (`mkdir exist_ok=False` vs `recursive:true`) — real but no realistic exposure.
- RX-1..5 touch `src/contracts/agent-config.ts` (+ substituteEnv); small enough for ONE agent (or do directly), TDD. RX-6 is runner-lifecycle (fold with/after Wave 2b).

## LATER — review & finish
1. **Consolidated adversarial review** of the whole parity branch once Wave 2b + Wave 3 are in: `/par` (2 competing adversarial reviewers, disqualified for inflated findings) **and** `roborev review --branch --wait --base atif-graft` (diff vs `atif-graft` to isolate the parity delta; use `--base origin/main` for the full stack). Triage real findings, fix (TDD), re-verify. Converge (≤1 clean round).
2. **Finish / PRs** (confirm strategy with Jesse): `atif-graft` → `main` is its own PR (ATIF graft + purge + cleanup). `ts-python-parity` → either `main` or stacked on the `atif-graft` PR. Both target the right base; show Jesse the diffs before opening. Per repo `CLAUDE.md`: one problem per PR; disclose agent authorship.
3. **Parent submodule bump**: after a merge to `main` here, open the follow-up PR in the parent `superpowers` repo (target `dev`) bumping the `evals` submodule pointer.

## CONVENTIONS every wave follows
- **Cosmetic-skip policy** (do NOT fix): numeric rounding mode (banker's vs half-up), error-message wording, exit-code NUMBER (1 vs 2), key ordering, whitespace/padding/wrapping/truncation, non-ASCII escaping. Fix everything with behavioral/correctness/security/crash impact.
- **Sanctioned divergences** (intentional, NOT gaps — see punch list lines 30-37): the scheduler (`--jobs` default 1→8, `launch_spacing_seconds`), `bin/` check tools staying bash, JSON-formatting-only diffs, no `src/agents/claude.ts` (claude is the YAML default), the new `src/dashboard/` + `src/scheduler/`.
- **Parallel-fan-out pattern** (Wave 1/2a were `Workflow` runs; honor Jesse's "use a workflow, max parallelism, strict TDD"): one isolated-worktree agent per DISJOINT-file group; each `git fetch origin && git reset --hard origin/ts-python-parity && bun install`, TDD each finding (failing test first), `bun run check` + `bun run quorum check` green, `git push origin HEAD:p<wave>-<group> --force-with-lease`, return structured {branch,status,fixed,skipped,gate}. Then the controller merges the branches into `ts-python-parity` (disjoint files → clean), re-gates, pushes, deletes the merged `p*` branches, prunes the leftover `wf_*` worktrees.
- **The runner (`src/runner/index.ts`) is the serialization point** — never fan out parallel agents against it; do runner work in ONE agent (or sequentially). That's why Wave 2b is a single agent.
- **Re-derive normalizer (D-*) findings** against `src/normalize/*.ts` (our ATIF normalizers ≠ Matt's deleted flat `src/normalizers/`); several D-* are not-applicable or TS-is-safer — don't "fix" TS into matching a Python crash.
- After each wave: clean up `p*` branches (`git push origin --delete …`) and leftover workflow worktrees (`git worktree remove --force …/wf_*`; `git worktree prune`).

## KEY ARTIFACT LOCATIONS
- Our audit: `/Users/jesse/2026-06-14-ts-python-parity-punchlist.md` (147 findings; sections by subsystem with Python+TS refs + line ranges).
- Reconciled net-new: `/Users/jesse/2026-06-14-reconciled-missing-findings.md` (the 6 RX lows).
- Colleague audits (already reconciled — mostly dup/out-of-scope): `/Users/jesse/yesterday-session-findings.md`, `/Users/jesse/2026-06-14-ts-python-parity-punchlist (1).md`.
- ATIF graft spec/plan (on `atif-graft`/`ts-python-parity`): `docs/superpowers/specs/2026-06-14-atif-graft-onto-quorum-ts.md`, `docs/superpowers/plans/2026-06-14-atif-graft-and-cleanup.md`.
- Workflow scripts persisted under `…/workflows/scripts/ts-python-parity-wave1-*.js` and `…-wave2a-*.js` (editable + re-runnable via `Workflow({scriptPath})`).
- Standing constraints: don't push to `main`; pushes to our feature branches are authorized ("push whenever you commit"); live `quorum run` evals are trusted-maintainer only (never in public CI); `.env` for keys lives at `/Users/jesse/git/prime-radiant-inc/serf` (source inline, never echo into transcript).
