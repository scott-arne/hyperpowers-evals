# 2026-06-09 — Kimi `tool_result_total_bytes` capture (SUP-329)

## Problem

`quorum/token_usage.py:parse_kimi_wire` hardcodes `"tool_result_total_bytes": 0`
in its return dict (line ~420). It only sums `usage.record` token rows and never
measures the byte size of tool-result payloads, so the value persisted in
`coding-agent-token-usage.json` is always `0` for the kimi backend (claude and
codex compute it for real).

Linear: SUP-329. Surfaced in the 2026-06-09 codex+kimi matrix; see
`docs/baselines/kimi-sweeps/2026-06-09.md`.

## Value (stated honestly)

This corrects a **persisted measurement number**; it does **not** change any
pass/fail behavior. A whiteboard review confirmed that **nothing currently
consumes `tool_result_total_bytes` for any backend**: `economics.py:_coding_block`
drops it, `show.py` doesn't render it, and `cost-tool-result-bloat/checks.sh`
grades qualitatively (via the Gauntlet-Agent ACs and the `bin/investigated`
"did investigation happen" proxy), not on the byte count. The field only lands in
`coding-agent-token-usage.json` for ad-hoc `jq` inspection. So the value here is:
make the persisted kimi measurement correct (today it's a lie: `0`), so it's
trustworthy for the eventual consumer — a bloat-grading check or an economics-pane
column — which is **out of scope** for this ticket. "Enables cross-agent
comparison" would be aspirational; the comparison code doesn't exist yet.

## Goal / non-goals

**Goal:** (1) compute `tool_result_total_bytes` for kimi with **parity** to the
codex parser, and (2) add a runtime guard so a future regression to `0` fails
loudly instead of silently. Parity is the constraint that settles the byte
computation.

**Non-goals:** SUP-328 (model-id / pricing); the field's first real consumer
(grading check / economics column); the cross-harness DRY pass (incl. a shared
`_utf8_len` helper across codex/kimi). All deferred.

## Verified wire schema

From inspecting the full kimi `results/` corpus (111 `wire.jsonl` files, 1,313
tool-result events; the cost-bloat and 38-file SDD runs are the deepest single
examples):

- Tool results are records of `type == "context.append_loop_event"` whose
  `event.type == "tool.result"`.
- Payload path: **`record["event"]["result"]["output"]`**.
- `output` is a **flat UTF-8 string in 100% of observed cases** (never a list of
  content blocks like claude's `tool_result.content`).
- `event.result.isError` (bool) appears on ~111/1,313 results; those still carry
  their full payload in `output`.
- **No truncation:** the kimi expert confirmed no wire-level truncation markers;
  the largest payloads carry an honest in-band tool-side cap (e.g. "Max 1000
  lines reached"), so `len(output.encode())` equals what the model actually saw —
  no undercount.

## Design

### Part 1 — compute the bytes in `parse_kimi_wire`

The current loop fuses two guards on one line
(`if not isinstance(row, dict) or row.get("type") != "usage.record": continue`),
so the tool-result branch can't simply go "before" it — the `isinstance` guard
must be **split out first**. Restructure the per-line body to:

```python
try:
    row = json.loads(line)
except json.JSONDecodeError:
    continue
if not isinstance(row, dict):
    continue
rtype = row.get("type")
if rtype == "context.append_loop_event":
    event = row.get("event")
    if isinstance(event, dict) and event.get("type") == "tool.result":
        result = event.get("result")
        if isinstance(result, dict):
            output = result.get("output")
            if isinstance(output, str):
                tool_result_total_bytes += len(output.encode("utf-8"))
    continue
if rtype != "usage.record":
    continue
# ... existing usageScope turn/session bucketing unchanged ...
```

Initialize `tool_result_total_bytes = 0` alongside `turn_rows`/`session_rows`, and
replace the hardcoded `"tool_result_total_bytes": 0` in the return dict with the
accumulator.

**Decisions (both resolve to parity with codex):**
- **Count `isError` results** — bytes the model ingested; codex/claude count error
  output too. Excluding them breaks comparability.
- **Inline** the computation (mirrors codex at `token_usage.py:311`), no shared
  helper — the dedup is a one-line guarded idiom (the *second* copy of the
  flat-string form; claude's list-aware version stays separate), and a helper is
  deferred to the DRY pass.

**Data flow / scope:** unchanged. `parse_kimi_wire` runs once per `wire.jsonl`;
`capture_tokens` already sums `tool_result_total_bytes` across all subagent wires
(line ~481), so SDD fan-out is covered with no new wiring. (The cross-wire sum
conflates per-subagent contexts, but that's a pre-existing, *uniform* property of
the metric across claude/codex/kimi — not introduced here, and out of scope.)

### Part 2 — runtime drift guard (the real silent-zero mitigation)

The invariant: for a backend whose token usage was captured (claude/codex/kimi —
others return `None` from `capture_tokens`, so they can't false-positive), a run
that captured **≥1 tool call but `tool_result_total_bytes == 0`** is anomalous —
the parser almost certainly stopped matching the wire's tool-result shape (schema
drift), the exact silent-zero failure that hid the original bug. Kimi tool
results always carry payload, so a legitimate all-empty run is effectively
impossible; false-positive risk is negligible.

Placement: the runner's kimi capture-validation block (`runner.py:~2206`, beside
the existing "kimi wire log(s) normalized to zero tool-call rows" guard), where
the tool-call count (`capture_result.row_count`) is in hand. `capture_token_usage`
must return the byte total (or the usage dict) so the runner can read it — a small
signature change.

**Loudness: non-blocking warning (decided).** The codebase has no logging
channel — it signals via structured verdict fields — so the guard surfaces as a
**capture-note / warning field on the verdict, rendered by `show.py`**, while the
run still grades normally. This respects the standing principle that token
capture is measurement-only and the pass/fail verdict is unaffected: a drifted
parser must not sink an otherwise-gradeable run. It is deliberately *not* an
`indeterminate(stage=capture)` (the louder, verdict-coupling option was
considered and rejected for that reason). The warning field is the small piece of
new plumbing this part adds.

## Testing

**Unit tests (logic)** — `tests/quorum/test_token_usage.py::TestParseKimiWire`,
inline-JSONL style:
- `test_sums_tool_result_bytes` — `tool.result` rows with known-length `output`
  strings; include a multibyte char (prove *bytes* not chars) and one `isError`
  result (prove errors counted); assert the exact UTF-8 byte sum.
- edge cases — non-string / missing `output` → 0; empty-string `output` → 0; a
  wire with no tool results → `0` without error.

**Regression test (parser-regression guard — NOT drift detection).** A fixture
derived from a real kimi capture, preserving the real record structure and key
paths, asserting the byte total computed over its tool-result outputs. (If the
full cost-bloat main wire is used, that's the validated **142,772 bytes**; prefer
a small hand-trimmed real-structure fixture — 2-3 records incl. one `isError` and
one multibyte payload — since the inline tests already cover logic and the fixture
only needs real *key paths*, not real *volume*.) **This catches us breaking our
own parser; it cannot catch production kimi changing its format** (a frozen
snapshot still parses green) — that is Part 2's job.

**Guard test** — a captured run (or fixture) with ≥1 tool call but
`tool_result_total_bytes == 0` sets the non-blocking capture-warning field (and
the run still grades).

## Risks

The byte path walks a 4-level chain of reverse-engineered, undocumented kimi
wire keys. If kimi renames an event or restructures the payload, every guard
misses and the accumulator stays 0 — the original silent-zero bug. This
brittleness is consistent with the rest of `token_usage.py` (all parsers
hardcode their formats' keys).

**Mitigation split, honestly:** Part 2's runtime guard is the *real* live-drift
tripwire — it observes production wire on every kimi run. The fixture regression
test only guards against *us* breaking the parser (a frozen snapshot can't detect
external drift). Earlier framing that called the fixture a "drift tripwire" was
wrong; this is corrected. Residual risk: the runtime guard is a non-blocking
warning (by design), so it informs rather than enforces; and if a future error
path emits a *structured* (non-string) `output`, the `isinstance(output, str)`
guard silently drops those bytes — acceptable given 100% flat-string in the
current corpus, but noted as a drift vector the runtime guard would catch (bytes
would fall while the tool-call count stays positive — exactly the guard's
trigger).
