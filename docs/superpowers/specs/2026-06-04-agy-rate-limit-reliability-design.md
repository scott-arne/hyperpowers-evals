# agy Rate-Limit Reliability — Design Specification

**Status:** Specification, ready for implementation planning. Revised after a
5-reviewer design pass. Not yet implemented.
**Date:** 2026-06-04
**Scope:** Stream 1 of 2. This spec covers **antigravity (`agy`) reliability
only** — surviving and recovering from the Gemini Code Assist rate window. The
suite-wide cost/length problem (scenario tiering, redundant-scenario cuts,
parallelism defaults) is a deliberately **separate** spec (Stream 2), even
though the two touch at one seam (§7).

**Frame.** A full `quorum run-all` that includes antigravity keeps "hitting the
5-hour limit": the sweep stalls, burns wall-clock on hung cells, and produces a
pile of indeterminates. This spec pins down what that limit actually is, then
fixes the harness so agy fails fast when throttled and eventually completes its
coverage — without pretending agy can use a backend it cannot.

---

## 1. Problem

In recorded runs, antigravity is the least reliable coding-agent: 19 of 49
indeterminate verdicts in the audited corpus were antigravity auth-preflight or
Code Assist rate-limit failures, and antigravity sweeps are the ones that
approach ~5 hours of wall-clock. Two things go wrong:

1. **A cell that exhausts the rate window mid-run hangs to its full budget.**
   The existing detection (§3) catches a window that is *already* exhausted when
   a cell starts, but not one that trips *during* the gauntlet-driven main run.
   That cell burns up to its `max_time` (10m default) and is then misfiled as an
   empty-trace / "investigate" indeterminate rather than a rate-limit.
2. **No path back to full coverage.** Once the window trips, the remaining agy
   cells are correctly skipped, but there is no one-command way to re-run just
   those deferred cells in the next window. agy coverage silently ends up
   partial.

## 2. Root cause — what the "5-hour limit" actually is

Confirmed by inspecting the installed `agy` binary and Google's current plan
documentation (2026-06-04):

- **agy v1.0.4 has exactly one backend:** Gemini Code Assist over an OAuth
  personal account (`~/.gemini/settings.json` → `selectedType: oauth-personal`).
  The binary contains **no** `GEMINI_API_KEY`, `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI`, or `GOOGLE_CLOUD_PROJECT` string — there is no
  API-key or Vertex/GCP metered path. *(Verified: 0 whole-word `strings` hits;
  corroborated by upstream feature request antigravity-cli#78.)* **We do not
  design around metered billing for agy — it cannot reach it.** (gemini, a
  *different* agent, can — §5 B5.)
- **The "5-hour limit" is the subscription's usage-refresh window.** Under
  Google's March 2026 Antigravity plan structure, Pro/Ultra subscriptions
  **refresh usage every 5 hours** (free tier refreshes weekly), metered by
  compute ("work done"), not a published request rate. A sweep burns the 5-hour
  compute budget partway in, then every subsequent agy call returns
  `RESOURCE_EXHAUSTED` until the window refreshes. *(Web-cited to
  blog.google / antigravity.google plan announcements; Google does not publish
  the absolute compute numbers — high confidence on the mechanism, not on the
  numeric ceiling.)*
- **The only throughput lever is the account tier.** AI Pro ($19.99) →
  AI Ultra **5×** ($99.99) → AI Ultra **20×** ($199.99). agy inherits the
  account entitlement automatically; no wiring change.

**Decision already taken:** the eval account (`arittr@gmail.com`, the account
agy already authenticates as) is upgraded to **AI Ultra 5×**. Because it is the
same account, nothing is re-seeded; the larger 5-hour bucket is live on the next
run.

## 3. What already exists (build on this, don't rebuild)

- `runner.py:460` — `ANTIGRAVITY_RATE_LIMIT_MARKER = "Code Assist rate limit"`.
- `runner.py:465` — `_AGY_RATE_LIMIT_SIGNALS = ("resource_exhausted",
  "ratelimitexceeded", "429")`, matched case-insensitively by
  `_agy_log_shows_rate_limit()` (`runner.py:468`).
- `runner.py:473` — `_run_antigravity_auth_preflight()` runs a 90s `agy --print`
  probe; on an empty/failed reply whose log shows a rate-limit signal it raises a
  `RunnerError(stage="setup")` carrying the marker. This catches an
  **already-exhausted** window cheaply, before the expensive main run.
- `run_all.py:612-651` — a per-batch latch: when a cell's verdict is a
  rate-limit verdict (`_is_rate_limited_verdict`, `run_all.py:781`), the agent is
  added to `rate_limited_agents`; subsequent cells for that agent short-circuit
  via `_RATE_LIMIT_SKIP_SENTINEL` (`run_all.py:166`) and never invoke.
- `run_all.py:661-678` — skipped cells are recorded distinctly as
  `skipped="rate-limited"` and counted in a dedicated `rate_limited` bucket
  (the `⏸` footer), **separate from indeterminate**.

So the *already-exhausted-at-start* case and the *skip-the-rest* latch are
solved. The gaps are mid-run detection (§4) and resume (§5).

## 4. Part A — fail fast and classify correctly

**Goal:** no agy cell hangs to its budget because of a 429, every 429 is recorded
as a rate-limit (with its cause) rather than a capture-stage indeterminate, and
the kill can never corrupt shared state.

> **A staff-SWE review corrected the original A1.** The first draft said "watch
> `agy.log` and kill the gauntlet subprocess." That does not work: (1)
> `invoke_gauntlet` calls a **blocking** `subprocess.run` (`runner.py:1185`) with
> no handle to kill; (2) gauntlet drives agy via `tmux new-session`, which
> **daemonizes agy away from gauntlet's process group** — killing gauntlet
> orphans agy to the tmux server, so it keeps burning the 5-hour bucket; (3) a
> killed-but-empty run lands in the **capture cascade** and is written as a
> `stage="capture"` "no Antigravity transcript captured" indeterminate
> (`runner.py:1583-1602`), so the latch never fires. The design below fixes all
> three.

**A1. Live mid-run detection — inside the runner, killing gauntlet's private
tmux server.** The watcher lives in `runner.invoke_gauntlet`, not `run_all`
(run-all owns only the child `quorum run` PID, and only the runner can synthesize
the verdict before the capture cascade). Run `invoke_gauntlet` via `Popen` with a
handle, and poll the main-run `agy.log` while it runs. On a **confirmed**
rate-limit (predicate in A2), tear the run down by **killing gauntlet's private
tmux server** — *not* a process-group kill.

> **Teardown mechanism — empirically verified (2026-06-04).** A controlled
> experiment confirmed the review and corrected an earlier draft of this spec: a
> tmux-spawned process is **reparented to PID 1 in its own process group**, so
> `os.killpg` on the launcher's group **cannot** reach agy (killing gauntlet just
> orphans agy, which keeps burning quota). `tmux kill-session` / `kill-server`
> **does** reap it. Gauntlet runs a **private tmux server per session**
> (`gauntlet/src/adapters/tui/adapter.ts:97`), so the clean teardown is
> `tmux -S <that-session's-socket> kill-server` (or kill the tracked pane pid),
> which reaps the bash + agy under it, scoped to exactly that cell and touching no
> other tmux. The implementation reads the socket/pane pid gauntlet exposes; the
> A5 reproduction confirms `pgrep -f agy` is empty afterward.

After teardown, short-circuit `_run_scenario_inner` to write **exactly one**
rate-limit verdict **before** the capture cascade runs, so the result is a
rate-limit, not an empty-trace indeterminate.

**A2. Confirm the rate-limit (predicate) and capture the `quota_metric`.** A
single `RESOURCE_EXHAUSTED` substring is not enough — agy logs it on retried,
*recovered* transient 429s too, so first-hit kill would defer passing runs on a
blip (and if it's the first agy cell, latch the whole sweep on a blip). The kill
predicate is: **a fatal `quota_metric` (the 5-hour compute window) OR ≥N
`RESOURCE_EXHAUSTED` lines with the transcript not advancing for T seconds.** The
`RESOURCE_EXHAUSTED` payload names *which* quota was hit (5-hour window vs Code
Assist day cap); extract and persist it as `verdict.error.quota_metric`. This both
drives the predicate (window = fatal; per-minute burst = maybe transient) and is
the diagnostic that tells us empirically whether 5× is enough (Part B). N and T
are pinned from the A5 reproduction, not guessed.

**A3. One verdict, correctly classified.** The mid-run-aborted cell records a
rate-limit verdict carrying the marker/flag (§6) and is counted as
`skipped="rate-limited"` / deferred — never indeterminate. The existing
latch-skipped cells already do this.

**A4. Credential safety — gates A1.** agy reads auth from the **shared, live,
token-rotating** `~/.gemini/oauth_creds.json` (the runner isolates only
`--gemini_dir` plugin/transcript state, `runner.py:576-599`; it does **not** copy
the credential). A `SIGKILL` during a token refresh — most likely *exactly* at a
rate-limit event — can leave that file half-written and auth-brick **all** future
agy runs (recovery is a manual browser OAuth flow). This also trips the project
rule against destructive ops on credentials without backup/read-back. Therefore:
**SIGTERM with a grace period before any SIGKILL** so agy can finish a credential
write; **back up `oauth_creds.json` before, and read-back-verify it after**, any
batch that may mid-run-kill agy, restoring on mismatch; and, as the durable fix,
**copy agy's auth into the per-run `--gemini_dir`** so a kill can never touch the
canonical token. A1 does not ship until credential safety is proven.

**A5. Reproduction gate — build nothing in A1–A4 until this passes.** Reproduce a
mid-run 429 against live agy and confirm, with assertions: **(a)** the watcher
attaches to the file the judge's *actual* launch writes — the main-run log is
`$ANTIGRAVITY_CONFIG_DIR/agy.log` (`launch-agent:22` →
`<run_dir>/coding-agent-config/agy.log`), **not** the preflight's
`tmp_path/agy.log`; pin and `touch` it before gauntlet starts so the watcher has a
stable inode from t=0, and treat "log absent past a grace window AND transcript
empty" as the existing empty-trace path, not a hang; **(b)** after teardown,
`pgrep -f agy` returns nothing (agy actually dead, tmux session gone) — not merely
"a run dir exists"; **(c)** the kill leaves `oauth_creds.json` intact (read-back
matches); **(d)** `agy.log` flushes the 429 line in real time (measure the delay
between the API error and the line; if buffered, switch detection to
`transcript.jsonl` stall + error, or find an unbuffer flag); **(e)** the predicate
distinguishes a fatal window-exhaustion from a recovered transient 429.

## 5. Part B — reliable coverage

**Goal:** agy eventually covers its whole scenario set despite the window, and a
partial sweep is never reported as green.

**B1. Bigger bucket (done, no code).** AI Ultra 5× is live on the eval account;
agy inherits it.

**B2. Resume-deferred — idempotent and interruption-safe.** Resume re-runs the
cells a batch did **not** terminally complete, into a fresh window. The review
found two ways the naive design loses cells, so the deferred set is defined
against the **full intended matrix**, not just written records:

- Persist the intended matrix (every `(scenario, agy)` cell `build_matrix`
  produced) to `batch.json` **up front**, so resume knows what was *supposed* to
  run. An interrupted batch (Ctrl-C, host sleep, 5-hour wall) leaves runnable
  cells with **no** record at all; without the up-front matrix, resume keyed only
  on `skipped="rate-limited"` silently skips them and reports false-complete.
- The deferred set = **intended-matrix cells whose latest record is rate-limited
  OR absent.** On a successful resume, supersede the old rate-limited record (or
  add an `attempt` index) so a *second* resume — the realistic case, since the
  resume window can itself trip — does not double-run already-passed cells.

Resume reuses the matrix-expansion and invoke machinery (no duplication); the
exact CLI shape is an implementation-plan detail. It must converge: repeated
resumes monotonically shrink the deferred set.

**B3. Keep the three sdd 90-minute builds off agy's routine set.** Records the
requirement; the mechanism is the Stream 2 tier (§7). If Stream 1 lands first, the
interim guard is a `# coding-agents:` allowlist on each sdd `checks.sh` (§7), with
a `build_matrix` test.

**B4. Validate, with a real fallback if 5× is not enough.** Run one full reshaped
agy sweep; from A2's `quota_metric` + the deferred count, compute
**windows-per-sweep**. Gate "stream done" on **windows-per-sweep ≤ 1**. If > 1,
the design does **not** silently leave a deferred tail — it must either ship
`--resume-until-complete` (wait for the window to refresh, re-invoke until the
deferred set is empty) or move more agy scenarios to adhoc until one window fits.
**A non-empty agy deferred set surfaces as a distinct non-green state** ("agy
coverage incomplete: N deferred"), never folded into a passing summary line.
Account fan-out across 2–3 accounts stays out of scope (YAGNI) until the
measurement says even `--resume-until-complete` is too slow.

**B5. Cross-agent quota (the other capped agents).** agy is the only agent on the
OAuth consumer Code Assist 5-hour window. **gemini is a *different* backend** — a
metered AI Studio key (`GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key`,
`gemini-context/launch-agent`) — so it does **not** share agy's window. Per the
maintainer's preference, **route gemini to a Vertex token on a controlled GCP
project** for isolated, predictable, metered billing (the gemini CLI supports a
Vertex auth mode; *verify the exact env/flag and stand up a billed project before
switching* — do not repeat the agy/Vertex mistake of assuming a backend). Once
gemini is on its own project, any "does gemini bill agy's account?" co-burn
concern is moot. `opencode` and `pi` also set `max_concurrency: 1` but, unlike
antigravity, with no documented rationale — likely copy-paste; **verify whether
their backends actually rate-limit before relaxing the cap.** The per-agent latch
(`rate_limited_agents`, keyed by agent name) is correct as long as each capped
agent has an independent backend; if two ever share one Google identity/quota it
must become per-backend — moot once gemini is on Vertex.

## 6. Data & interfaces

- **Rate-limit verdict invariant (single owner).** *Any* agy verdict produced
  after a rate-limit signal — from the preflight, the mid-run abort (A1), or a
  Stream 2 **check-only** (judge-skipped) run — MUST carry the rate-limit
  marker/flag, regardless of which code path wrote it. This is the one fact the
  latch, composer, and summary all key on. Stream 1 owns this invariant; Stream 2's
  check-only path (its §4) must honor it, or an agy check-only sentinel that 429s
  would silently fail to latch. Broaden `_is_rate_limited_verdict`
  (`run_all.py:781`) to match the marker/flag **regardless of `error.stage`**
  (today it requires `stage=="setup"`).
- **`quota_metric`** — optional field on the rate-limit verdict's error block
  (A2); absent when unparseable.
- **Intended matrix** — `batch.json` records every `(scenario, agy)` cell
  `build_matrix` produced, written up front, so resume can compute "absent" cells
  (B2).
- **Deferred set** — intended-matrix cells whose latest record is rate-limited or
  absent (B2). Latest-record-per-cell; a successful resume supersedes the prior
  rate-limited record.

No change to pass/fail/indeterminate semantics. "Deferred / rate-limited" remains
a *skip* category, not a verdict.

## 7. Seam to Stream 2 (suite cost/length)

The coupling is **which scenarios agy runs**, and the review caught that the
original "tiering keeps agy in its window by construction" does **not** compute:
tier membership is a property of a **scenario**, but the 5-hour window is consumed
per **(scenario, agent) cell**, and `build_matrix` fans every un-directived
scenario across *all* agents (only 11/39 carry a `# coding-agents:` allowlist). So
`--tier full --coding-agents antigravity` would run *every* full-tier scenario on
agy — there is no "agy-applicable full-thorough" until something defines it.

Requirement: the seam is satisfied only when **`--tier sentinel --coding-agents
antigravity` and `--tier full --coding-agents antigravity` each yield an
enumerated, measured, window-fitting set** (B4's windows-per-sweep ≤ 1 measured,
not asserted). Either tier membership becomes expressible per-agent, or agy's
routine set is an explicit allowlist. **Interim guard if Stream 1 lands first:**
add a `# coding-agents:` allowlist to each of the three sdd `checks.sh` excluding
agy, plus a `build_matrix` test. Note the allowlist enumerates the *other* agents,
so it **goes stale when a new agent is added** — the test must fail loudly when an
agent is missing from the list, or Stream 2 must pivot to a denylist mechanism.

## 8. Testing

Follow TDD; unit tests must be deterministic and must not hit the live Code Assist
backend. The live-only facts (teardown, flush, credential safety) are proven once
in the A5 reproduction, then encoded as fixtures.

- **A1 detection + verdict path:** the log-watcher trips on a synthetic main-run
  `agy.log` gaining a `RESOURCE_EXHAUSTED` line mid-stream, and a single
  rate-limit verdict is written **before** the capture cascade (assert it is a
  rate-limit, not a `stage="capture"` empty-trace indeterminate).
- **A2 predicate + quota_metric:** a *recovered transient* 429 (signal, then the
  transcript advances) does **not** trip; a fatal window `quota_metric` does;
  field extraction is persisted and absent-safe.
- **A4 credential safety:** SIGTERM-grace precedes SIGKILL; `oauth_creds.json` is
  backed up and read-back-verified; a corrupted read-back triggers restore.
- **A5 reproduction (gating, live, manual):** `pgrep -f agy` empty after teardown;
  watcher attaches to the main-run log path; flush latency recorded.
- **Latch / cross-stream:** an agy verdict carrying the marker latches regardless
  of `error.stage`; a **check-only (judge-skipped) agy scenario that 429s still
  latches** the rest of agy (the Stream 1 ↔ Stream 2 invariant, §6).
- **B2 resume convergence:** (i) interrupt a batch after K of N records → resume
  re-runs the N−K absent cells plus the rate-limited ones; (ii) a resume that
  itself re-trips does not double-run passed cells (two-generation); repeated
  resumes monotonically shrink the deferred set.

Test output must be pristine; intentionally-triggered rate-limit errors are
captured and asserted, never leaked to logs.

## 9. Open questions / future

- **gemini → Vertex (B5)** — verify the gemini CLI's exact Vertex auth env/flag
  and stand up a billed GCP project before switching; until then gemini stays on
  its current metered AI Studio key. Confirm the key's billing identity.
- **opencode / pi concurrency caps (B5)** — verify whether their backends actually
  rate-limit; relax the `max_concurrency: 1` cap if it was copy-paste.
- **Account fan-out** — deferred (B4), only if `--resume-until-complete` proves
  too slow.
- **Model selection (`--model`, agy ≥1.0.5)** — a cheaper/higher-quota Flash tier
  could widen headroom but needs an agy update (evals disable auto-update) and a
  launcher `--model`. Out of scope; note for later.
- **Gauntlet-side early-abort hook** — A1 takes the quorum-side teardown now; a
  future gauntlet hook that ends a run on its own 429 would be cleaner.

## 10. Non-goals

- Metered/Vertex/API-key routing for **agy** (impossible on v1.0.4; gemini is
  different — B5).
- Scenario tiering, redundant-scenario cuts, parallelism defaults (Stream 2).
- Changing the Gauntlet-Agent (judge) model.

**Named dependency (no longer a silent non-goal).** The non-agy half of the ~28%
indeterminate rate — stuck-judge and empty-trace capture failures — is a real
reliability problem this spec does not fix. But it is **not** nobody's: Stream 2's
judge-skip on the sentinel tier depends on capture working (an empty trace becomes
an *unmediated* indeterminate once the judge is removed), so it is called out as a
precondition in the Stream 2 spec and needs its own follow-up ("Stream 3"). It is
no longer buried as a non-goal.
