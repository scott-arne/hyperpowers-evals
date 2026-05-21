# Migration Notes

Tracks decisions, deferrals, and skipped scenarios during the Drill→Gauntlet
migration. Reviewed before Phase 3 decommission.

## Phase 1 deferrals

- ~~**Token-cost wiring.**~~ **Resolved 2026-05-20.** The runner now calls
  `harness/token_usage.py` after every run via `capture_token_usage`
  (`harness/capture.py`), writing `token_usage.json` into the run dir.
  See "Decision: cost / measurement model" below.
- ~~**`setup.sh` shell-out latency.**~~ **Resolved 2026-05-20.** The
  `setup-helpers run <name>` CLI landed (ergonomics study item #3);
  `setup.sh` is no longer an inline `uv run python -c` block.
- **PATH inheritance in assertions.** Phase 1 is not a CI workload. Document
  required tooling (jq, git, python) in the harness README before any CI
  integration.

## Decision: cost / measurement model (2026-05-20)

The cost-* scenarios are the first *quantitative* dimension — "did the
skill fire" is genuinely binary, "used 47k tokens" is not. Decision,
so the verdict model does not have to change:

- **The verdict stays binary.** `compose()` remains pass/fail. A cost
  scenario expresses its budget as an ordinary deterministic assertion
  — a `tokens-under <N>` style check that reads the measurement and
  exits 0/1. That fits the existing assertion model with no new
  composition logic.
- **The measurement is preserved separately.** When the first cost-*
  scenario ports, the runner calls `harness/token_usage.py` and writes
  `token_usage.json` into the run dir alongside `verdict.json` (as
  Drill did). The verdict answers "within budget?"; the measurement
  file answers "by how much?" and is what trend analysis reads.
- No "measurements channel" inside `verdict.json`; keeping the verdict
  purely binary is worth more than co-locating the number.

Wired 2026-05-20: `harness/runner.py` step 9b calls `capture_token_usage`
after every run, so `token_usage.json` lands in the run dir for all
targets (claude/codex; gemini/pi produce no file — no parser).

Cost-* scenarios ported 2026-05-20: they turned out to be pattern
instruments (brainstorming over-trigger, tool-result bloat, spec/plan
duplication, review fan-out) — not token-threshold checks — so the
anticipated `tokens-under` helper was not needed. Their deterministic
assertions are claude-shaped pattern gates (skill-not-called, Read/Grep,
Agent count) and carry no `compatible_targets`, so a codex run still
produces a valid `token_usage.json` even if the claude-shaped assertion
misfires. The cross-backend cost comparison reads `token_usage.json`,
which is backend-agnostic. Making the assertions themselves target-aware
is a deferred follow-up.

## Phase 1 first-run findings (2026-05-18)

First parity attempt on `triggering-writing-plans` surfaced three real bugs the test suite missed because every test used `tmp_path` (always absolute) and `unittest.mock.patch` for the gauntlet subprocess:

1. **Relative scenario_dir broke setup.sh subprocess** — `subprocess.run([str(p)], cwd=X)` resolves relative `p` against `X`, not the harness's cwd. Fixed: CLI resolves every path to absolute at the boundary. Regression test added in `test_cli.py`.
2. **Claude session-log glob was stale** — `**/session-*.jsonl` matched nothing because current claude writes `<UUIDv4>.jsonl`. Drill's pattern was outdated. Fixed: glob is now `**/*.jsonl` in `harness/targets/claude.yaml`.
3. **tmux strips arbitrary env vars from new sessions** — `HARNESS_AGENT_CWD` and `SUPERPOWERS_ROOT` exported by the harness never reached the QA agent's bash. The QA agent ran `cd "$HARNESS_AGENT_CWD"` against an empty value (no-op), so claude launched in gauntlet's scratch dir. Fixed: runner templates HOWTO files at runtime, substituting the placeholders with resolved absolute paths.

The deeper Gauntlet-side fix for #3 is to have the TUI adapter pass `tmux new-session -e VAR=value` for each env var (or accept an allowlist). File upstream when convenient; current harness workaround works without Gauntlet changes.

### #3 root cause resolved (2026-05-20)

The "tmux strips env vars" framing in #3 was incomplete. The real
mechanism: `tmux new-session` attaches to an already-running shared
tmux server, and the new session inherits the *server's* environment,
not the calling process's. When the server was started by some
unrelated process, no per-run var reaches the agent. This bit Drill
hard once `CLAUDE_CONFIG_DIR` isolation landed (user plugins like
Bobiverse leaked in; logs written outside Drill's view) and then
`ANTHROPIC_API_KEY` (agent booted unauthenticated) — same root cause
in Harness via Gauntlet's TUI adapter.

Fixed properly in both:
- **Drill** — each `TmuxSession` runs on a private `-L <socket>`
  server, started by Drill so it inherits Drill's full environment.
- **Gauntlet** — same change in the TUI adapter (branch
  `matt/tui-private-tmux-server` in the gauntlet repo). A private
  server propagates *everything* with no enumeration — strictly better
  than the `-e VAR=value` allowlist idea above.

Consequence: the HOWTO runtime-templating workaround for
`$HARNESS_AGENT_CWD` / `$SUPERPOWERS_ROOT` / `$CLAUDE_CONFIG_DIR` is
now redundant — those vars reach the QA agent's shell by inheritance
once the Gauntlet branch is merged. The templating is harmless and
left in place; simplifying it (and the substitution map in
`runner._populate_context_dir`) is a deferred cleanup, not urgent.

## Run-1 triage (2026-05-20)

First full run of the 25-scenario harness suite. Two findings worth
keeping:

- **Gauntlet can hallucinate a tool call.** In
  `mid-conversation-skill-invocation` the QA verdict (`result.md`)
  asserted "dispatched the first subagent", but `tool_calls.jsonl` had
  no `Agent` call — the QA agent mistook an on-screen "Implementing
  Task 1…" status line for a real dispatch. The deterministic
  `02-subagent-dispatched` assertion caught the false positive, so the
  binary verdict (gauntlet AND assertions) came out `fail`, correctly.
  The measurement model earned its keep. The SDD-dispatch story.md
  briefs now state explicitly that a task list / status line is not a
  dispatch.
- **`worktree-consent-flow` — open question.** AC #1 is "the agent
  proceeds to worktree creation without stopping to ask" (naming the
  worktree skill is itself consent). The agent stopped and asked —
  "per the skill, I should ask before creating a worktree" — and
  gauntlet failed it. The scenario is internally consistent and gave a
  clear verdict, but whether "named the skill ⇒ implicit consent" is
  the intended worktree-skill semantics is unconfirmed. Resolve against
  the superpowers worktree skill before trusting this scenario's
  verdict. It sits opposite `worktree-caller-consent-gate`, which
  requires the agent to ask.

Assertion-quality fixes from the same run: dropped the fragile
`commit-history >= 4` checks from the sdd-* build scenarios (an
arbitrary proxy — build + tests + dispatch counts already prove
execution); strengthened the `sdd-go-fractals` test assertion to
require `*_test.go` files exist, since `go test ./...` exits 0 on an
empty suite.

## Code-review follow-ups from Phase 1 build

Logged here for Phase 2 attention; none block Phase 1 ship.

- ~~**I-2 (Faraday on T10): stale lockfile recovery.**~~ **Resolved
  2026-05-19.** The lockfile was guarding a shared `~/.claude/projects`
  log root against cross-run snapshot/diff contamination. The
  CLAUDE_CONFIG_DIR / CODEX_HOME isolation gives each run its own
  config-dir tree (under `<run-dir>/agent-config/`), so the lock no
  longer has a target to protect. Dropped along with `_single_run_lock`.
- **I-3 (Faraday on T10): same-second run dir collision.** `run_dir =
  out_root / f"{scenario}-{target}-{timestamp}"` with second granularity
  and `exist_ok=True`. Two runs within the same second would silently share
  a dir and trample each other's `verdict.json`. Phase 1's lockfile blocks
  the intra-target case but not different scenarios with shared names. Add
  a short random suffix or set `exist_ok=False` in a polish pass.
- **M-4/M-5 (Faraday): test coverage gaps in runner helpers** —
  `_resolve_launch_cwd` doesn't have a test for the "sentinel points at
  nonexistent path" raise, and `_gauntlet_status_from_run_dir` doesn't
  have a test for malformed JSON / unexpected status string. Both raise
  cleanly; tests would lock in current behavior.

## Skipped scenarios

Drill scenarios deliberately not ported, with the reason.

- **`worktree-codex-app-detached-head`, `worktree-codex-app-detached-head-spec-aware`**
  (skipped 2026-05-20). Both are `manual: true` / `backend: codex-app`
  in Drill — they require the Codex *App* (the hosted product), where a
  human creates a task and the App hands the agent a detached-HEAD
  worktree under `$CODEX_HOME/worktrees/`. The harness automates via
  Gauntlet + a CLI; it cannot drive the Codex App. The behavior they
  test — an agent recognizing an externally-managed detached-HEAD
  worktree and not creating a new one — is covered automatably by
  `worktree-codex-detached-head` (+ `-spec-aware`), which synthesize
  the same detached-HEAD condition with setup helpers. No coverage
  lost.

## Phase 1 parity outcomes

To be filled in by the manual parity runs (Tasks 18–20).
