# Kimi tool-result-bloat capture + surfacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make kimi runs report a real `tool_result_total_bytes` (today hardcoded `0`) and surface that bloat number in the economics output so it's tracked and read.

**Architecture:** Two small changes plus tests. (1) `parse_kimi_wire` sums the UTF-8 byte length of every kimi `tool.result` output, with parity to the codex parser. (2) That number is carried into the verdict's economics block (`economics.py:_coding_block`) and rendered in the economics pane (`show.py`). No verdict-schema change, no runtime guard — a visible number is its own regression signal.

**Tech Stack:** Python 3.11+, `uv`, `pytest`, `ruff`, `ty`. Spec: `docs/superpowers/specs/2026-06-09-kimi-tool-result-bytes-design.md`.

---

### Task 1: Compute `tool_result_total_bytes` in `parse_kimi_wire`

Kimi tool results live in `context.append_loop_event` records where `event.type == "tool.result"`, at `record["event"]["result"]["output"]` (a flat UTF-8 string). The current loop fuses the `isinstance(row, dict)` guard with the `usage.record` filter on one line, so it drops every non-usage row before a tool-result branch could see it — the guard must be split.

**Files:**
- Modify: `quorum/token_usage.py` (`parse_kimi_wire`, lines 347-426)
- Test: `tests/quorum/test_token_usage.py` (`TestParseKimiWire`, after line 221)

- [ ] **Step 1: Write the failing tests**

Add to `tests/quorum/test_token_usage.py` inside `class TestParseKimiWire` (after `test_malformed_usage_fields_contribute_zero`, ~line 221):

```python
    def test_sums_tool_result_bytes(self, tmp_path: Path):
        p = tmp_path / "wire.jsonl"
        rows = [
            # a usage.record so the parser returns a dict (needs >=1 selected row)
            {"type": "usage.record", "usageScope": "turn",
             "model": "kimi-for-coding", "time": 1800000000000,
             "usage": {"inputOther": 1, "inputCacheRead": 0,
                       "inputCacheCreation": 0, "output": 1}},
            # plain ASCII output -> 5 bytes ("hello")
            {"type": "context.append_loop_event",
             "event": {"type": "tool.result", "toolCallId": "t1",
                       "result": {"output": "hello"}}},
            # multibyte output -> 5 bytes ("café": c,a,f = 3, é = 2)
            {"type": "context.append_loop_event",
             "event": {"type": "tool.result", "toolCallId": "t2",
                       "result": {"output": "café"}}},
            # isError result is still counted -> 4 bytes ("boom")
            {"type": "context.append_loop_event",
             "event": {"type": "tool.result", "toolCallId": "t3",
                       "result": {"output": "boom", "isError": True}}},
        ]
        p.write_text("".join(json.dumps(r) + "\n" for r in rows))

        usage = parse_kimi_wire(p)

        assert usage is not None
        # 5 + 5 + 4 = 14
        assert usage["tool_result_total_bytes"] == 14

    def test_tool_result_bytes_edge_cases(self, tmp_path: Path):
        p = tmp_path / "wire.jsonl"
        rows = [
            {"type": "usage.record", "usageScope": "turn",
             "model": "kimi-for-coding", "time": 1800000000000,
             "usage": {"inputOther": 1, "inputCacheRead": 0,
                       "inputCacheCreation": 0, "output": 1}},
            # non-string output -> contributes 0
            {"type": "context.append_loop_event",
             "event": {"type": "tool.result",
                       "result": {"output": {"nested": "obj"}}}},
            # missing output -> 0
            {"type": "context.append_loop_event",
             "event": {"type": "tool.result", "result": {}}},
            # empty string -> 0
            {"type": "context.append_loop_event",
             "event": {"type": "tool.result", "result": {"output": ""}}},
            # a non-tool.result loop event -> ignored
            {"type": "context.append_loop_event",
             "event": {"type": "content.part",
                       "part": {"type": "text", "text": "ignored"}}},
        ]
        p.write_text("".join(json.dumps(r) + "\n" for r in rows))

        usage = parse_kimi_wire(p)

        assert usage is not None
        assert usage["tool_result_total_bytes"] == 0
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/quorum/test_token_usage.py::TestParseKimiWire::test_sums_tool_result_bytes tests/quorum/test_token_usage.py::TestParseKimiWire::test_tool_result_bytes_edge_cases -v`
Expected: `test_sums_tool_result_bytes` FAILS with `assert 0 == 14` (the hardcoded `0`); `test_tool_result_bytes_edge_cases` PASSES (already 0).

- [ ] **Step 3: Implement the byte computation**

In `quorum/token_usage.py:parse_kimi_wire`, initialize the accumulator. Change lines 356-357 from:

```python
    turn_rows: list[dict[str, Any]] = []
    session_rows: list[dict[str, Any]] = []
```

to:

```python
    turn_rows: list[dict[str, Any]] = []
    session_rows: list[dict[str, Any]] = []
    tool_result_total_bytes = 0
```

Replace the loop body (lines 362-371) — split the fused guard and add the tool-result branch before the `usage.record` filter:

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
            if row.get("usageScope") == "turn":
                turn_rows.append(row)
            elif row.get("usageScope") == "session":
                session_rows.append(row)
```

Replace the hardcoded return value (line 420) from:

```python
        "tool_result_total_bytes": 0,
```

to:

```python
        "tool_result_total_bytes": tool_result_total_bytes,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/quorum/test_token_usage.py::TestParseKimiWire -v`
Expected: all `TestParseKimiWire` tests PASS (the new two plus the three existing — the existing ones have no `tool.result` rows, so their byte total stays 0 and they're unaffected).

- [ ] **Step 5: Commit**

```bash
git add quorum/token_usage.py tests/quorum/test_token_usage.py
git commit -m "feat(kimi): compute tool_result_total_bytes in parse_kimi_wire (SUP-329)"
```

---

### Task 2: Carry `tool_result_total_bytes` into the economics block

`_coding_block` builds the coding-agent economics dict that lands in `verdict.json`. It currently drops `tool_result_total_bytes`. Add it (defaulting to 0 so older usage files without the key don't break).

**Files:**
- Modify: `quorum/economics.py` (`_coding_block`, lines 64-98)
- Test: `tests/quorum/test_economics.py` (after line 39)

- [ ] **Step 1: Write the failing tests**

Add to `tests/quorum/test_economics.py` (after `test_both_agents_present`, ~line 40):

```python
def test_coding_block_surfaces_tool_result_bytes(tmp_path):
    _gauntlet_result(tmp_path)
    _coding_usage(tmp_path, tool_result_total_bytes=142772)
    econ = build_run_economics(tmp_path)
    assert econ["coding_agent"]["tool_result_total_bytes"] == 142772


def test_coding_block_defaults_tool_result_bytes_to_zero(tmp_path):
    _gauntlet_result(tmp_path)
    _coding_usage(tmp_path)  # payload has no tool_result_total_bytes key
    econ = build_run_economics(tmp_path)
    assert econ["coding_agent"]["tool_result_total_bytes"] == 0
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/quorum/test_economics.py::test_coding_block_surfaces_tool_result_bytes -v`
Expected: FAIL with `KeyError: 'tool_result_total_bytes'`.

- [ ] **Step 3: Add the key to `_coding_block`**

In `quorum/economics.py:_coding_block`, add one line to the returned dict (after the `"est_cost_usd"` line, ~line 96):

```python
        "est_cost_usd": usage.get("est_cost_usd"),
        "tool_result_total_bytes": usage.get("tool_result_total_bytes", 0),
        "has_unpriced_model": has_unpriced_model,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/quorum/test_economics.py -v`
Expected: all PASS (the two new tests plus existing — existing `_coding_usage` payloads lack the key and get the `0` default, which they don't assert on).

- [ ] **Step 5: Commit**

```bash
git add quorum/economics.py tests/quorum/test_economics.py
git commit -m "feat(economics): carry tool_result_total_bytes into the coding-agent block (SUP-329)"
```

---

### Task 3: Render tool-result bytes in the economics pane

Add a human-readable byte formatter and a row in the economics pane. It renders only when the value is truthy, so existing runs (no bytes, or 0) are visually unchanged.

**Files:**
- Modify: `quorum/show.py` (`_fmt_tokens` neighbourhood ~line 176; `_format_economics_pane` lines 216-236)
- Test: `tests/quorum/test_show.py` (append at end of file)

- [ ] **Step 1: Write the failing test**

Append to `tests/quorum/test_show.py`:

```python
def test_economics_pane_renders_tool_result_bytes():
    from quorum.show import _format_economics_pane

    verdict = {
        "economics": {
            "gauntlet": None,
            "coding_agent": {
                "duration_ms": 1000,
                "model": "kimi-for-coding",
                "models": [],
                "tokens": {"total": 1000},
                "est_cost_usd": None,
                "tool_result_total_bytes": 142772,
            },
            "total_est_cost_usd": None,
            "partial": True,
        }
    }

    pane = _format_economics_pane(verdict, color=False)

    assert "143KB" in pane


def test_economics_pane_omits_zero_tool_result_bytes():
    from quorum.show import _format_economics_pane

    verdict = {
        "economics": {
            "gauntlet": None,
            "coding_agent": {
                "duration_ms": 1000,
                "model": "kimi-for-coding",
                "models": [],
                "tokens": {"total": 1000},
                "est_cost_usd": None,
                "tool_result_total_bytes": 0,
            },
            "total_est_cost_usd": None,
            "partial": True,
        }
    }

    pane = _format_economics_pane(verdict, color=False)

    assert "tool bytes" not in pane
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `uv run pytest tests/quorum/test_show.py::test_economics_pane_renders_tool_result_bytes -v`
Expected: FAIL — `"143KB"` not in the rendered pane.

- [ ] **Step 3: Add the formatter and the render row**

In `quorum/show.py`, add `_fmt_bytes` immediately after `_fmt_tokens` (after line 179):

```python
def _fmt_bytes(n) -> str:
    if not isinstance(n, (int, float)) or n == 0:
        return "—"
    if n >= 1_000_000:
        return f"{n/1_000_000:.1f}MB"
    if n >= 1_000:
        return f"{n/1_000:.0f}KB"
    return f"{int(n)}B"
```

In `_format_economics_pane`, add the row after the per-model sub-row loop (after line 228, before the `total = ...` line):

```python
    for entry in (coding or {}).get("models") or []:
        rows.append(_model_subrow(entry))
    tr_bytes = (coding or {}).get("tool_result_total_bytes")
    if tr_bytes:
        rows.append(f"  {'tool bytes':<10} {'':>10} {_fmt_bytes(tr_bytes):>9} {'':>9}")
    total = econ.get("total_est_cost_usd")
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `uv run pytest tests/quorum/test_show.py -v`
Expected: all PASS — `142772` formats to `143KB` (142772/1000 = 142.772 → `.0f` → 143); the zero case renders no `tool bytes` row.

- [ ] **Step 5: Commit**

```bash
git add quorum/show.py tests/quorum/test_show.py
git commit -m "feat(show): render tool-result bytes in the economics pane (SUP-329)"
```

---

### Task 4: Real-structure regression fixture

A checked-in fixture with kimi's real wire **key paths** (not real volume) pins the parser against schema drift in our own code. Mirrors how claude/codex use fixture files (`tests/fixtures/cc_session.jsonl`, `codex_rollout.jsonl`; `tests/quorum/fixtures` is a symlink to `tests/fixtures`).

**Files:**
- Create: `tests/fixtures/kimi_wire.jsonl`
- Test: `tests/quorum/test_token_usage.py` (`TestParseKimiWire`)

- [ ] **Step 1: Create the fixture**

Write `tests/fixtures/kimi_wire.jsonl` with exactly these lines (real kimi record shapes — `metadata`, `config.update`, a `tool.call`, two `tool.result`s incl. one `isError`, a `usage.record` — with short payloads):

```
{"type":"metadata","protocol_version":"1"}
{"type":"config.update","modelAlias":"__kimi_env_model__"}
{"type":"context.append_loop_event","event":{"type":"tool.call","toolCallId":"t1","name":"Read","args":{"path":"a.js"}}}
{"type":"context.append_loop_event","event":{"type":"tool.result","toolCallId":"t1","result":{"output":"line one\nline two\n"}}}
{"type":"context.append_loop_event","event":{"type":"tool.result","toolCallId":"t2","result":{"output":"naïve café","isError":true}}}
{"type":"usage.record","usageScope":"turn","model":"__kimi_env_model__","time":1800000000000,"usage":{"inputOther":100,"inputCacheRead":0,"inputCacheCreation":0,"output":50}}
```

- [ ] **Step 2: Write the failing test**

Add to `tests/quorum/test_token_usage.py` inside `class TestParseKimiWire`:

```python
    def test_real_structure_fixture_byte_total(self):
        fixture = Path(__file__).parent / "fixtures" / "kimi_wire.jsonl"
        usage = parse_kimi_wire(fixture)
        assert usage is not None
        # "line one\nline two\n" = 18 bytes (ASCII);
        # "naïve café" = 12 bytes (ï and é are 2 bytes each); 18 + 12 = 30
        assert usage["tool_result_total_bytes"] == 30
        # sanity: the usage.record was still parsed
        assert usage["total_output"] == 50
```

- [ ] **Step 3: Run the test to verify it passes**

Run: `uv run pytest "tests/quorum/test_token_usage.py::TestParseKimiWire::test_real_structure_fixture_byte_total" -v`
Expected: PASS (Task 1's implementation already computes the bytes; this test pins it against the real record structure). If it fails on the byte count, recompute the two outputs' UTF-8 lengths and correct the literal — do NOT change the parser.

- [ ] **Step 4: Commit**

```bash
git add tests/fixtures/kimi_wire.jsonl tests/quorum/test_token_usage.py
git commit -m "test(kimi): real-structure regression fixture for tool_result_total_bytes (SUP-329)"
```

---

### Task 5: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full quorum test suite**

Run: `uv run pytest`
Expected: all pass (1 pre-existing skip — the known sanitized-env test). No new failures.

- [ ] **Step 2: Lint and typecheck**

Run: `uv run ruff check && uv run ty check`
Expected: clean.

- [ ] **Step 3: Spot-check the surfaced number on a real run dir (optional, no commit)**

Run: `uv run quorum show results/cost-tool-result-bloat-kimi-20260609T055457Z-7e3c`
Expected: the economics pane now shows a `tool bytes` row (~`143KB`) instead of nothing. (This run dir's `coding-agent-token-usage.json` still holds the old `0`; if so, the row won't show — that's fine, it confirms the render is value-driven. A fresh kimi run would show the real number.)

- [ ] **Step 4: Final commit if anything changed**

```bash
git status
# only commit if a lint/format fix was needed:
git add -A && git commit -m "chore: lint/format for SUP-329"
```
