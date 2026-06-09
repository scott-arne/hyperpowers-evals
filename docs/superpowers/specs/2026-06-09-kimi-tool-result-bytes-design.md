# 2026-06-09 — Kimi `tool_result_total_bytes` capture (SUP-329)

## Problem

`quorum/token_usage.py:parse_kimi_wire` hardcodes `"tool_result_total_bytes": 0`
in its return dict (line ~420). It only sums `usage.record` token rows and never
measures the byte size of tool-result payloads. As a result the
`cost-tool-result-bloat` scenario's headline metric — bytes of tool output the
agent pulled into context — is always `0` for the kimi backend, so kimi can't be
compared on tool-result bloat against claude or codex.

Linear: SUP-329. Surfaced in the 2026-06-09 codex+kimi matrix; see
`docs/baselines/kimi-sweeps/2026-06-09.md`.

## Goal / non-goals

**Goal:** compute `tool_result_total_bytes` for kimi with **parity** to the
codex and claude parsers, so the cross-agent bloat number is measured the same
way everywhere. Parity is the design constraint that settles the open choices.

**Non-goals:**
- SUP-328 (kimi model-id resolution + pricing) — separate ticket.
- The cross-harness DRY/observability pass — deferred until every harness works.
  In particular, a shared `_utf8_len` helper across codex/kimi, and any
  "tool calls captured but bytes == 0" sanity flag, belong to that pass, not here.

## Verified wire schema

From inspecting real kimi `wire.jsonl` across two runs (the cost-bloat run and
the 38-file SDD fan-out), 1,313 real tool-result events:

- Tool results are records of `type == "context.append_loop_event"` whose
  `event.type == "tool.result"`.
- Payload path: **`record["event"]["result"]["output"]`**.
- `output` is a **flat UTF-8 string in 100% of observed cases** (never a list of
  content blocks like claude's `tool_result.content`).
- `event.result.isError` (bool) appears on ~111/1,313 results; those still carry
  their full payload in `output`.

## Design

A single additive change to `parse_kimi_wire`, no signature changes:

1. Initialize `tool_result_total_bytes = 0` alongside `turn_rows` / `session_rows`.
2. In the per-line loop, **before** the existing
   `if row.get("type") != "usage.record": continue` short-circuit (which
   otherwise drops every non-usage row), add a branch:
   ```python
   if rtype == "context.append_loop_event":
       event = row.get("event")
       if isinstance(event, dict) and event.get("type") == "tool.result":
           result = event.get("result")
           if isinstance(result, dict):
               output = result.get("output")
               if isinstance(output, str):
                   tool_result_total_bytes += len(output.encode("utf-8"))
       continue
   ```
3. Replace the hardcoded `"tool_result_total_bytes": 0` in the return dict with
   the accumulator.

**Decisions (both resolve to parity):**
- **Count `isError` results.** They are bytes the model ingested; codex and
  claude both count error output. Excluding them would make kimi's number
  non-comparable.
- **Inline** the byte computation (mirrors codex at `token_usage.py:311`), not a
  shared helper. The dedup is a one-line idiom with a type guard, claude can't
  share it (it needs list-of-blocks handling), and a shared helper is explicitly
  deferred to the DRY pass.

**Data flow / scope:** unchanged. `parse_kimi_wire` runs once per `wire.jsonl`;
`capture_tokens` already sums `tool_result_total_bytes` across all subagent wires
(line ~481), so SDD fan-out is covered with no additional wiring. The
`isinstance(output, str)` guard makes non-string / missing payloads contribute 0
(defensive, mirrors codex).

## Testing

**Unit tests (logic)** — in `tests/quorum/test_token_usage.py::TestParseKimiWire`,
inline-JSONL style (the existing kimi convention):
- `test_sums_tool_result_bytes` — a wire with `context.append_loop_event` /
  `tool.result` rows whose `output` strings have known lengths; include a
  multibyte character (prove it counts *bytes*, not chars) and one `isError`
  result (prove errors are counted); assert the exact summed UTF-8 byte count.
- edge cases — `tool.result` with non-string / missing `output` contributes 0; a
  wire with no tool results returns `tool_result_total_bytes == 0` without error.

**Regression test (schema-drift tripwire)** — a fixture **derived from a real
kimi capture**, preserving the real record structure and key paths (not a
hand-written approximation), asserting the byte total computed over its
tool-result outputs. (If the full cost-bloat main wire is used as the fixture,
that total is the validated **142,772 bytes**; a trimmed fixture asserts the
recomputed sum over the records it retains.) The inline tests prove the *logic*;
this proves we are still parsing *kimi's actual format*. If kimi's wire schema
ever drifts from what we reverse-engineered, this test fails **loudly** instead
of the parser silently returning 0 again.

## Risks

The fix walks a 4-level path of kimi-internal string keys reverse-engineered from
an undocumented CLI wire format. If kimi renames an event or restructures the
payload, every `isinstance` guard misses, the accumulator stays 0, and we regress
to the original bug — **a wrong number with no error**. This silent-zero failure
mode is the same one that hid the original bug.

This brittleness is **consistent with the rest of `token_usage.py`** (the codex
and claude parsers hardcode their formats' keys too — the whole module is
reverse-engineered log parsing), so the fix is no more brittle than its
neighbors. The real-wire fixture regression test is the mitigation: it turns a
silent regression into a loud test failure. A broader observability guard (flag
runs with captured tool calls but `tool_result_total_bytes == 0`) is real but
cross-cutting and deferred to the DRY/observability pass.
