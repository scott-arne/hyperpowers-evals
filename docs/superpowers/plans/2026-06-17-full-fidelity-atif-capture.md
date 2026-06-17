# Full-Fidelity ATIF Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade every coding-agent normalizer to emit a *lossless* ATIF trajectory — message text, reasoning, tool calls **and their outputs**, per-step model + disjoint metrics, session_id and agent metadata — so the transcript record is complete and the next-generation `check-transcript` verbs can assert on reasoning and tool results, not just tool calls.

**Architecture:** Our `src/normalize/<agent>.ts` converters currently emit tool-call-only trajectories and drop message/reasoning/observation content the captured logs already contain. We upgrade each converter to extract that content, using Harbor's `installed/<agent>.py` converter + its unit tests as the *reference implementation* for what to extract and how, while preserving our conventions (disjoint token buckets, canonical tool names, single-source metrics, dedup, obol pricing). One agent (antigravity) additionally needs a capture-source change to obtain token usage at all. The ATIF type surface (`src/atif/types.ts`) already models every field — **no schema change required**.

**Tech Stack:** TypeScript / Bun (≥1.3); the harness's existing `src/atif`, `src/normalize`, `src/capture` modules; Harbor 0.14.0 (pinned commit `5352049de712613e58459cad41afcf0bf8645738`) as the parity oracle, installed at `/tmp/harbor-spike/venv` (`harbor==0.14.0`) and source-cloned at `/tmp/harbor-inspect`.

## Global Constraints

- **No ATIF schema change.** Populate existing fields only: `AtifStep.{message, reasoning_content, observation, model_name, timestamp}`, `AtifTrajectory.{session_id}`, `AtifAgent.{version, extra}`. (`src/atif/types.ts` already declares all of them.)
- **Keep DISJOINT token buckets.** `prompt_tokens` = UNCACHED input; `cached_tokens` = cache-read; `step.extra.cache_write` = cache-creation; `completion_tokens` = output (+ reasoning where the log splits it). NEVER Harbor's summed/inclusive `prompt = input + cache_read + cache_creation`.
- **Keep SINGLE-SOURCE metrics.** A converter emits per-step `metrics` OR `final_metrics`, never both (obol's `atif` dialect skips `final_metrics` when any step has metrics — a hybrid silently drops buckets, the "copilot at 1k" bug).
- **Keep CANONICAL tool names.** Apply our per-agent `*_TOOL_MAP` + `agent-prompt.ts` (subagent dispatch → `Agent`, prompt arg → `prompt`). Harbor passes native names through; never adopt that.
- **Never fabricate cost.** Emit `cost_usd` only when the source log records one (opencode, pi); otherwise leave unset — obol prices downstream. NEVER port Harbor's LiteLLM pricing.
- **Pin `ATIF_SCHEMA_VERSION` (v1.7)** from `src/atif/types.ts`; never a literal (Harbor hardcodes `ATIF-v1.6`).
- **Additive, non-breaking.** Existing `check-transcript` verbs read only `tool_calls`; populating message/reasoning/observation must not change existing verdicts. `bun run check` and `bun run quorum check` stay green after every task.
- **TDD with Harbor as oracle.** Each task ports the relevant Harbor unit-test fixtures into `test/normalize.<agent>.test.ts` (translating Python event fixtures + assertions to TS), and validates disjoint-token + structure parity against Harbor's converter on a real captured trace via the Phase-1 harness.
- **Validation traces** live under `results/` (one per agent from the `20260616T052827Z` bootstrap sweep, plus larger SDD runs). Harbor reference converters: `/tmp/harbor-inspect/src/harbor/agents/installed/<agent>.py`; Harbor tests: `/tmp/harbor-inspect/tests/unit/agents/installed/test_<agent>*.py`.

---

## Task 1: Harbor-parity validation harness (foundation)

**Files:**
- Create: `scripts/harbor-parity.ts` (a dev-only oracle runner; documented, not wired into `bun run check`)
- Create: `scripts/README-harbor-parity.md` (when to use it, how to point it at a trace)

**Interfaces:**
- Produces: a CLI `bun scripts/harbor-parity.ts <agent> <captured-log-path>` that (a) runs our `normalize<Agent>` on the captured log, (b) shells to `/tmp/harbor-spike/venv/bin/python` running Harbor's converter on the same log, (c) prints a side-by-side of tool-call histogram, **disjoint** token totals (translating Harbor's inclusive prompt: `uncached = total_prompt − cached − cache_creation`), step count, and which content fields each populates. Used by every later task as the parity check.

- [ ] **Step 1: Write a failing smoke test** in `test/harbor-parity.test.ts` that imports a `disjointFromHarbor(harborTrajectory)` helper (to be created in `scripts/harbor-parity.ts`) and asserts it turns a Harbor inclusive-bucket `final_metrics` `{total_prompt_tokens: 94269, total_cached_tokens: 71457, extra:{total_cache_creation_input_tokens: 17118}}` into `{uncached: 5694, cached: 71457, cache_write: 17118}`.
- [ ] **Step 2: Run it, confirm it fails** (`bun test test/harbor-parity.test.ts`) — `disjointFromHarbor` not defined.
- [ ] **Step 3: Implement** `disjointFromHarbor` + the CLI runner (reuse the verified approach in `/tmp/harbor-spike/spike.py`; the claude bf6f trace already validates these exact numbers).
- [ ] **Step 4: Run it, confirm pass**, then run `bun scripts/harbor-parity.ts claude results/superpowers-bootstrap-claude-20260616T052827Z-bf6f/home/.claude/projects/*/` and confirm it reports our (now-fixed) claude totals 5694/71457/17118/528 == Harbor.
- [ ] **Step 5: Commit** (`scripts/harbor-parity.ts`, `scripts/README-harbor-parity.md`, `test/harbor-parity.test.ts`).

---

## Phase 2 — Per-normalizer full-fidelity upgrades

Each task below upgrades one `src/normalize/<agent>.ts` to full fidelity per its audit. The audit gap-list IS the spec; Harbor's converter is the reference implementation for the extraction logic. Order is by value (correctness/data first). For EACH task the step pattern is identical:

1. Port the relevant Harbor unit-test cases into `test/normalize.<agent>.test.ts` (translate the Python event fixtures + assertions to TS inline fixtures). Run; confirm they FAIL.
2. Implement the extraction in `src/normalize/<agent>.ts`, honoring every Global Constraint.
3. Run the new + existing `test/normalize.<agent>.test.ts`; confirm all pass.
4. Run `bun scripts/harbor-parity.ts <agent> <real-trace>`; confirm tool-call + disjoint-token parity with Harbor and that the new content fields are populated.
5. Run `bun run check` (biome+tsc+all tests) and `bun run quorum check`; confirm green (additive — no existing verdict changes).
6. Commit.

### Task 2: claude full fidelity (highest value — includes a correctness fix)

**Files:** Modify `src/normalize/claude.ts`; Test `test/normalize.claude.test.ts`. Reference: `/tmp/harbor-inspect/src/harbor/agents/installed/claude_code.py`, `tests/unit/agents/installed/test_claude_code_trajectory.py`.

**Interfaces:**
- Consumes: nothing new.
- Produces: claude trajectories with populated `message`, `reasoning_content`, `observation`, real `agent.version`; **uuid-deduped** steps.

Add (per the claude audit):
- [ ] **uuid dedup** before anything else — drop rows whose `uuid` repeats after a `compact_boundary` (Harbor `claude_code.py:645-657`). This is a **correctness/cost fix** (compaction replays double-count tool_results/tokens), not just fidelity. Test: two rows with the same `uuid` → one step, usage once.
- [ ] **thinking block `text`-key + `reasoning`/`analysis` types** → `reasoning_content` (Harbor `:419-429`). We currently only read `b.type==='thinking' && b.thinking`.
- [ ] **tool_result → `observation`** with Harbor's rich formatting (`toolUseResult` stdout/stderr/exitCode/interrupted/isImage, `is_error`) (Harbor `:516-587`).
- [ ] **assistant + user message text → `step.message`**, byte-faithful, multi-part join `'\n\n'` (Harbor `:862-1043`).
- [ ] **turn-bundling by `message.id`** — text + reasoning + all tool_use sharing one message.id collapse into one step (Harbor `:736-859`).
- [ ] **real `agent.version`** from the log's `version` field (currently hardcoded `'unknown'`); `agent.extra` (cwds/git_branches/agent_ids, `:680-704`).
- [ ] DO NOT: summed prompt tokens (`:487-491`), `final_metrics`, stream-json `total_cost_usd` (`:589-618`). Keep our disjoint per-step model + the already-correct `lastUsageByMessageId` dedup.

### Task 3: gemini full fidelity (includes a correctness fix)

**Files:** Modify `src/normalize/gemini.ts`; Test `test/normalize.gemini.test.ts`. Reference: `gemini_cli.py`, `test_gemini_cli.py`.

Add (per the gemini audit):
- [ ] **`$rewindTo` handling** — truncate the accumulated message set back to the rewound id; an unknown id clears all (Harbor `gemini_cli.py:465-474`). **Correctness fix**: without it, a rewound/abandoned turn's tool calls + tokens are miscounted. Port `_load_gemini_session`'s event-log reconstruction (`:436-497`) — the real log is a `$set`/`$rewindTo`/bare-row event log, NOT the `{messages:[]}` shape our current fixtures use.
- [ ] **`$set.messages` fallback** — if no bare gemini rows are present, reconstruct from the last `$set.messages` (defensive vs a log-shape change).
- [ ] **`tool` token fold** — `completion = output + thoughts + tool` (we currently drop `tool`; `gemini_cli.py:371`). Trivial, removes a latent undercount.
- [ ] **reasoning (`thoughts`) → `reasoning_content`** ("subject: description" joined, `:250-262`).
- [ ] **tool-result → `observation`** from `result[].functionResponse.response.output` (`:286-359`).
- [ ] **`session_id`** from `sessionId`.
- [ ] DO NOT: `final_metrics` (single-source), LiteLLM cost.

### Task 4: codex full fidelity

**Files:** Modify `src/normalize/codex.ts`; Test `test/normalize.codex.test.ts`. Reference: `codex.py`, `test_codex_trajectory.py`.

Add (per the codex audit):
- [ ] **messages** (`response_item:message` → user/agent message steps, `codex.py:444-463`).
- [ ] **reasoning** (`response_item:reasoning` `summary[]` → `reasoning_content`, carried forward onto the next assistant/tool step; `:434-442`).
- [ ] **observations** (`function_call_output`/`custom_tool_call_output` paired to their call by `call_id` → `observation`; `:184-206, 525-549`).
- [ ] **`web_search_call`** payload → an `Agent`-vocab-safe tool call (`:465-490`) — a real tool call we currently drop entirely.
- [ ] **`session_id`** + real **`agent.version`** (from `session_meta.payload.id`/`cli_version`) + `agent.extra` (cwd/git/originator).
- [ ] DO NOT: native tool names (keep `exec_command`→Bash etc.), the single-session `ValueError` (keep per-file normalize + capture-layer merge), LiteLLM pricing, raw `input_tokens` as prompt (keep the input−cached disjoint correction).

### Task 5: opencode full fidelity

**Files:** Modify `src/normalize/opencode.ts`; Test `test/normalize.opencode.test.ts`. Reference: `opencode.py`, `test_opencode.py`. (Our `opencode export` `{info, messages[{info,parts}]}` already contains all of this; we currently iterate only `type==="tool"` parts.)

Add (per the opencode audit):
- [ ] **text parts → `step.message`** (`:246-249`).
- [ ] **reasoning parts → `step.reasoning_content`** joined `'\n\n'` (`:251-254`).
- [ ] **tool output → `observation`** from `state.output` (`:274-280`) — the main opencode fidelity gap.
- [ ] **real `callID` → `tool_call_id`** (and `observation.source_call_id`) instead of the synthetic `${stepId}` (`:261`).
- [ ] **`session_id`** from `info.id`; per-part **timestamps**.
- [ ] DO NOT: Harbor's `prompt = input + cache_read` overlap (keep disjoint), `final_metrics`. Keep our `OPENCODE_TOOL_MAP`, provider capture, per-message cost passthrough.

### Task 6: kimi full fidelity

**Files:** Modify `src/normalize/kimi.ts`; Test `test/normalize.kimi.test.ts`. Reference: `kimi_cli.py`, `test_kimi_cli.py`. (Our `wire.jsonl` carries `tool.result` rows we currently drop.)

Add (per the kimi audit):
- [ ] **`tool.result` rows → `observation`** linked to the call by id (we explicitly drop them today; `normalize.kimi.test.ts:70-74`).
- [ ] **assistant message text + `think`/reasoning → `message`/`reasoning_content`** IF our `append_loop_event` stream carries them — **verify against a real `wire.jsonl` first**; only implement for fields actually present.
- [ ] DO NOT: Harbor's cache-into-prompt folding (keep disjoint), Harbor's hybrid metrics (keep single-source + our turn-vs-session scope dedup), and keep `Skill` canonicalization + `kimiLogsHaveSuperpowersSessionStart`.
- [ ] **Note (do not invent):** neither we nor Harbor alias a kimi subagent→`Agent`; the native subagent tool name is unknown from all fixtures. Leave the alias gap flagged in `atif-normalizers.md`; do NOT guess a name.

### Task 7: copilot full fidelity (guardrail task — mostly verify, do not regress)

**Files:** Modify `src/normalize/copilot.ts`; Test `test/normalize.copilot.test.ts`. Reference: `copilot_cli.py` (**older/buggier than ours** — do not port its parser).

- [ ] **Verify** what our session-state log (`assistant.message`/`session.shutdown`/`toolRequests`) carries for message/reasoning/tool-output, against a real captured copilot trace. (Harbor reads a *different* log — `--output-format=json` stdout — so its parser is not applicable.)
- [ ] **message text → `step.message`** and **tool output → `observation`** only for fields actually present in our log.
- [ ] **HARD GUARDRAIL:** keep the final-metrics-only single-source token sourcing (the "copilot at 1k" fix). Do NOT add per-step `metrics`. Do NOT adopt Harbor's hybrid (`copilot_cli.py:276-307`), its v1.6 literal, or its lack of `COPILOT_TOOL_MAP`/cache awareness.

### Task 8: antigravity full fidelity — content (normalizer)

**Files:** Modify `src/normalize/antigravity.ts`; Test `test/normalize.antigravity.test.ts`. Reference: our real fixture `test/fixtures/antigravity-real-no-usage.jsonl` (brain-transcript shape; Harbor's gemini-shaped parser is NOT applicable — different file).

- [ ] **`content` (USER_INPUT + PLANNER_RESPONSE) → `step.message`** and **`thinking` → `reasoning_content`** (present in our brain transcript, currently dropped).
- [ ] Keep `ANTIGRAVITY_TOOL_MAP` + `invoke_subagent→Agent` + arg normalization (we lead Harbor here). Keep the no-token stance for THIS file (tokens come from Task 9's capture change, not the brain transcript).

---

## Phase 3 — Capture-source change (data we don't have yet)

### Task 9: capture antigravity token usage

**Files:** Modify `coding-agents/antigravity.yaml` (+ the capture glob handling in `src/capture/index.ts` / the antigravity adapter as needed); Modify `src/normalize/antigravity.ts`; Test `test/normalize.antigravity.test.ts` + a capture test.

**Interfaces:**
- Consumes: agy's `~/.agy/antigravity-cli/tmp/session-*.{jsonl,json}` (the gemini-shaped session file Harbor reads).
- Produces: antigravity trajectories that carry token usage (currently zero).

- [ ] **First, verify** agy's `tmp/session-*.jsonl` actually carries `tokens{input,output,cached,thoughts,tool}` (run a real agy session or inspect an existing run's `home`). If it does NOT, STOP and report — there is no other token source and the task is moot.
- [ ] If it does: capture that file alongside the brain transcript, and extract its tokens into our DISJOINT buckets (mirroring `gemini.ts`'s token mapping). This is a capture-source addition, not a parser swap — keep the brain-transcript content extraction from Task 8.
- [ ] Validate tokens against Harbor's antigravity converter (which reads the same tmp session) via the parity harness.

---

## Phase 4 — Verb overhaul (separate plan, unblocked by Phases 1–3)

Once trajectories carry reasoning + observations + message text, the `check-transcript` vocabulary can grow verbs that assert on them (e.g. `observation-contains`, `reasoning-mentions`, `tool-output-matches`). **Out of scope for this plan** — it gets its own brainstorm + plan once the fidelity foundation lands, because the right verb set depends on what the richer ATIF makes assertable.

---

## New-agent ports (separate effort)

Porting Harbor converters for agents we do NOT have (cursor, cline, devin, goose, qwen, …) follows `docs/superpowers/reference/porting-harbor-converters.md`, full-fidelity from the start. **Gated on per-agent provisioning + auth** (the real breadth bottleneck), so tracked separately from this normalizer-fidelity plan.

## Self-Review notes

- **Spec coverage:** every agent with a TS normalizer (claude, gemini, codex, opencode, kimi, copilot, antigravity) has a task; the antigravity token gap (the one true capture gap) has its own Phase-3 task; pi is intentionally excluded (no Harbor converter, no audit gap). The verb overhaul and new-agent ports are explicitly deferred to separate plans.
- **No contract change:** confirmed against `src/atif/types.ts` — all target fields already exist.
- **Conventions consistency:** the five Global Constraints (disjoint / single-source / canonical / no-fabricated-cost / v1.7) are repeated as DO-NOT items in every task because each audit independently flagged them as the regression traps.
- **Verify-before-implement** is built into the kimi (message/think) and copilot (log content) and antigravity-tokens (Task 9) tasks, where the audits could not confirm the source data is present.
