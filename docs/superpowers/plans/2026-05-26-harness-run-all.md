# Harness `run-all` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `harness run-all`, a thin batch driver that fans out (scenario × Coding-Agent) pairs across `--jobs N` concurrent child runs of `harness run`, writes a minimal batch index, and lets `harness show <batch-id>` render the results as a matrix.

**Architecture:** A new module `harness/run_all.py` constructs the (scenario × agent) matrix, pre-filters by the `# coding-agents:` directive, and schedules runnable pairs through a `ThreadPoolExecutor(max_workers=jobs)`. Each worker shells out to `uv run harness run …` so child processes are fully isolated from the parent. The parent main thread receives completions via `as_completed`, appends one JSON record per pair to `results.jsonl`, and prints a live progress line. `harness/show.py` gains a `render_batch()` function and `harness/cli.py` teaches `show` to recognize `results-harness/batches/<id>/` targets.

**Tech Stack:** Python 3.11+, `click` (CLI), `concurrent.futures.ThreadPoolExecutor`, `subprocess`, `pytest`.

**Spec:** [docs/superpowers/specs/2026-05-26-harness-run-all-design.md](../specs/2026-05-26-harness-run-all-design.md)

---

## File structure

**Create:**
- `harness/run_all.py` — orchestrator: matrix construction, child subprocess wrapper, scheduling, output writing, live progress.
- `tests/harness/test_run_all.py` — unit tests for the orchestrator.

**Modify:**
- `harness/cli.py` — print `run-id:` line in `run()`; register `run-all` command; teach `show()` to dispatch to batch renderer when target is a batch dir.
- `harness/show.py` — add `render_batch(batch_dir, *, color)` plus helpers; extend `resolve_target()` (or add `resolve_batch_target()`) so it recognizes a batch directory layout.
- `tests/harness/test_cli.py` — extend with tests for the new `run-id:` line and the `run-all` Click wiring.
- `tests/harness/test_show.py` — extend with matrix renderer tests.
- `README.md` and `CLAUDE.md` — short note pointing at `run-all` as the preferred way to run the full suite.

**Responsibility split:**
- `run_all.py` owns *what* runs and *when* (matrix, scheduling, progress, batch artifacts).
- `show.py` owns *how* batches are rendered (matrix table, legend, `--json`).
- `cli.py` is thin glue.

---

## Task 1: Print `run-id:` line on `harness run` stdout

**Why first:** Every later task depends on the parent being able to learn a child's run ID. This is a one-line CLI change with one new test.

**Files:**
- Modify: `harness/cli.py` (the `run` function, around line 57-87)
- Test: `tests/harness/test_cli.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/harness/test_cli.py`:

```python
def test_run_prints_run_id_line(tmp_path, monkeypatch):
    """`harness run` prints `run-id: <id>` as the first stdout line."""
    from click.testing import CliRunner
    from harness.cli import main
    from harness.composer import FinalVerdict

    # Stub run_scenario so we don't actually drive an agent.
    fake_run_dir = tmp_path / "results-harness" / "foo-claude-20260526T180001Z-abcd"
    fake_run_dir.mkdir(parents=True)
    fake_verdict = FinalVerdict(
        final="pass", final_reason="ok",
        gauntlet={"status": "pass", "reason": "ok"},
        checks={"pre": [], "post": []},
        error=None,
    )

    def fake_run_scenario(**kwargs):
        return fake_run_dir, fake_verdict

    monkeypatch.setattr("harness.cli.run_scenario", fake_run_scenario)

    # Minimal scenario dir to satisfy click.Path(exists=True).
    scenario_dir = tmp_path / "scenario"
    scenario_dir.mkdir()

    result = CliRunner().invoke(main, [
        "run", str(scenario_dir), "--coding-agent", "claude",
    ])
    first_line = result.output.splitlines()[0]
    assert first_line == "run-id: foo-claude-20260526T180001Z-abcd"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/harness/test_cli.py::test_run_prints_run_id_line -x -q`
Expected: FAIL — first stdout line is the renderer header, not `run-id:`.

- [ ] **Step 3: Implement**

In `harness/cli.py`, inside the `run` function, immediately after `run_scenario(...)` returns and BEFORE the existing `click.echo(render(...))` call, add:

```python
    # Machine-readable line for `harness run-all` to parse. Printed
    # unconditionally — color/mode flags don't affect it.
    click.echo(f"run-id: {run_dir.name}")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `uv run pytest tests/harness/test_cli.py::test_run_prints_run_id_line -x -q`
Expected: PASS.

- [ ] **Step 5: Run the full test suite to confirm no regression**

Run: `uv run pytest -x -q`
Expected: PASS (no failures introduced).

- [ ] **Step 6: Commit**

```bash
git add harness/cli.py tests/harness/test_cli.py
git commit -m "harness: print run-id: <id> as first stdout line of \`run\`

Co-Authored-By: Penric@eabdc077 (Opus 4.7)"
```

---

## Task 2: Matrix construction (pure function)

**Why next:** The orchestrator's first responsibility is to compute the (scenario × agent) matrix and label each cell as runnable or skipped (directive). Pure function, fully unit-testable with `tmp_path`.

**Files:**
- Create: `harness/run_all.py`
- Test: `tests/harness/test_run_all.py`

- [ ] **Step 1: Create `harness/run_all.py` with module docstring + dataclass**

```python
"""harness run-all — batch driver over `harness run`.

Constructs the (scenario × Coding-Agent) matrix, pre-filters pairs by the
`# coding-agents:` directive in each scenario's checks.sh, runs the
runnable pairs concurrently as child `harness run` processes, and writes a
minimal batch index under results-harness/batches/<id>/.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from harness.checks import parse_coding_agents_directive


@dataclass(frozen=True)
class MatrixEntry:
    """One (scenario, agent) cell of the batch matrix.

    `skipped_reason` is None for runnable cells, "directive" for cells
    excluded by `# coding-agents:`.
    """
    scenario: str
    coding_agent: str
    scenario_dir: Path
    skipped_reason: str | None  # None | "directive"

    @property
    def runnable(self) -> bool:
        return self.skipped_reason is None
```

- [ ] **Step 2: Write failing tests for `build_matrix`**

Create `tests/harness/test_run_all.py`:

```python
"""Tests for harness.run_all."""

from __future__ import annotations

from pathlib import Path

import pytest

from harness.run_all import MatrixEntry, build_matrix


def _scenario(root: Path, name: str, *, directive: str | None = None) -> Path:
    d = root / name
    d.mkdir(parents=True)
    (d / "story.md").write_text("---\nid: x\ntitle: t\n---\n")
    directive_line = f"# coding-agents: {directive}\n" if directive else ""
    (d / "checks.sh").write_text(directive_line + "pre() { :; }\npost() { :; }\n")
    return d


def _agent(root: Path, name: str) -> None:
    root.mkdir(parents=True, exist_ok=True)
    (root / f"{name}.yaml").write_text(f"name: {name}\nbinary: echo\n")


def test_build_matrix_full_cross_product_when_no_directive(tmp_path):
    scenarios = tmp_path / "scenarios"
    agents = tmp_path / "agents"
    _scenario(scenarios, "alpha")
    _scenario(scenarios, "beta")
    _agent(agents, "claude")
    _agent(agents, "codex")

    entries = build_matrix(scenarios_root=scenarios, coding_agents_dir=agents)

    assert len(entries) == 4
    pairs = {(e.scenario, e.coding_agent) for e in entries}
    assert pairs == {("alpha", "claude"), ("alpha", "codex"),
                     ("beta", "claude"), ("beta", "codex")}
    assert all(e.runnable for e in entries)


def test_build_matrix_marks_directive_excluded_pairs_skipped(tmp_path):
    scenarios = tmp_path / "scenarios"
    agents = tmp_path / "agents"
    _scenario(scenarios, "alpha", directive="codex")
    _scenario(scenarios, "beta")  # no directive — runnable on both
    _agent(agents, "claude")
    _agent(agents, "codex")

    entries = build_matrix(scenarios_root=scenarios, coding_agents_dir=agents)

    skipped = {(e.scenario, e.coding_agent) for e in entries if not e.runnable}
    runnable = {(e.scenario, e.coding_agent) for e in entries if e.runnable}
    assert skipped == {("alpha", "claude")}
    assert runnable == {("alpha", "codex"), ("beta", "claude"), ("beta", "codex")}
    for e in entries:
        if not e.runnable:
            assert e.skipped_reason == "directive"


def test_build_matrix_filters_agents(tmp_path):
    scenarios = tmp_path / "scenarios"
    agents = tmp_path / "agents"
    _scenario(scenarios, "alpha")
    _agent(agents, "claude")
    _agent(agents, "codex")

    entries = build_matrix(
        scenarios_root=scenarios, coding_agents_dir=agents,
        agent_filter=["claude"],
    )

    assert {e.coding_agent for e in entries} == {"claude"}


def test_build_matrix_unknown_agent_in_filter_raises(tmp_path):
    scenarios = tmp_path / "scenarios"
    agents = tmp_path / "agents"
    _scenario(scenarios, "alpha")
    _agent(agents, "claude")

    with pytest.raises(ValueError, match="unknown coding-agent.*gemini"):
        build_matrix(
            scenarios_root=scenarios, coding_agents_dir=agents,
            agent_filter=["gemini"],
        )


def test_build_matrix_sorts_entries_for_deterministic_output(tmp_path):
    scenarios = tmp_path / "scenarios"
    agents = tmp_path / "agents"
    _scenario(scenarios, "zeta")
    _scenario(scenarios, "alpha")
    _agent(agents, "codex")
    _agent(agents, "claude")

    entries = build_matrix(scenarios_root=scenarios, coding_agents_dir=agents)

    names = [(e.scenario, e.coding_agent) for e in entries]
    assert names == sorted(names)
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `uv run pytest tests/harness/test_run_all.py -x -q`
Expected: FAIL — `build_matrix` not defined.

- [ ] **Step 4: Implement `build_matrix`**

Append to `harness/run_all.py`:

```python
def _discover_scenarios(scenarios_root: Path) -> list[Path]:
    """Mirror `harness list`: scenario dirs are children with story.md."""
    return sorted(
        d for d in scenarios_root.iterdir()
        if d.is_dir() and (d / "story.md").exists()
    )


def _discover_agents(coding_agents_dir: Path) -> list[str]:
    return sorted(p.stem for p in coding_agents_dir.glob("*.yaml"))


def build_matrix(
    *,
    scenarios_root: Path,
    coding_agents_dir: Path,
    agent_filter: list[str] | None = None,
) -> list[MatrixEntry]:
    """Compute the (scenario × agent) matrix.

    - Scenarios: every dir under `scenarios_root` with a `story.md`.
    - Agents: every `*.yaml` under `coding_agents_dir`, optionally
      filtered by `agent_filter` (CSV from --coding-agents).
    - For each pair, read the `# coding-agents:` directive in
      checks.sh; pairs excluded by the directive are returned with
      `skipped_reason="directive"`.

    Entries are sorted by (scenario, agent) for deterministic output.
    Raises ValueError if `agent_filter` names an unknown agent.
    """
    available = _discover_agents(coding_agents_dir)
    if agent_filter is not None:
        unknown = [a for a in agent_filter if a not in available]
        if unknown:
            raise ValueError(
                f"unknown coding-agent(s): {', '.join(unknown)} "
                f"(available: {', '.join(available)})"
            )
        agents = [a for a in available if a in agent_filter]
    else:
        agents = available

    entries: list[MatrixEntry] = []
    for scenario_dir in _discover_scenarios(scenarios_root):
        directive = parse_coding_agents_directive(scenario_dir / "checks.sh")
        for agent in agents:
            skipped = (
                "directive"
                if directive is not None and agent not in directive
                else None
            )
            entries.append(MatrixEntry(
                scenario=scenario_dir.name,
                coding_agent=agent,
                scenario_dir=scenario_dir,
                skipped_reason=skipped,
            ))
    entries.sort(key=lambda e: (e.scenario, e.coding_agent))
    return entries
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `uv run pytest tests/harness/test_run_all.py -x -q`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add harness/run_all.py tests/harness/test_run_all.py
git commit -m "harness: run_all matrix construction with directive pre-filter

Co-Authored-By: Penric@eabdc077 (Opus 4.7)"
```

---

## Task 3: Child subprocess wrapper + run-id parsing

**Why next:** Once we can enumerate the matrix, we need a primitive that runs one pair as a child process and returns either a run ID or an error. Isolated and unit-testable with a stubbed subprocess invocation.

**Files:**
- Modify: `harness/run_all.py`
- Test: `tests/harness/test_run_all.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/harness/test_run_all.py`:

```python
from unittest.mock import patch
from subprocess import CompletedProcess

from harness.run_all import ChildResult, invoke_child


def test_invoke_child_parses_run_id_from_stdout(tmp_path):
    fake_stdout = (
        "run-id: foo-claude-20260526T180001Z-abcd\n"
        "header line one\n"
        "header line two\n"
    )
    completed = CompletedProcess(args=[], returncode=0, stdout=fake_stdout, stderr="")
    with patch("harness.run_all.subprocess.run", return_value=completed) as mock:
        result = invoke_child(
            scenario_dir=tmp_path / "foo",
            coding_agent="claude",
        )
    assert result.run_id == "foo-claude-20260526T180001Z-abcd"
    assert result.exit_code == 0
    assert result.error is None
    # Verify we shelled out to `uv run harness run`:
    cmd = mock.call_args[0][0]
    assert cmd[:4] == ["uv", "run", "harness", "run"]
    assert "--coding-agent" in cmd and "claude" in cmd


def test_invoke_child_records_nonzero_exit_with_run_id_when_present(tmp_path):
    """A fail verdict exits 1 but still emits run-id. We record both."""
    completed = CompletedProcess(
        args=[], returncode=1,
        stdout="run-id: foo-claude-20260526T180001Z-abcd\n",
        stderr="",
    )
    with patch("harness.run_all.subprocess.run", return_value=completed):
        result = invoke_child(
            scenario_dir=tmp_path / "foo", coding_agent="claude",
        )
    assert result.run_id == "foo-claude-20260526T180001Z-abcd"
    assert result.exit_code == 1
    assert result.error is None  # exit 1 is a normal fail verdict, not a child error


def test_invoke_child_no_run_id_in_stdout_is_error(tmp_path):
    """Child crashed before allocating a run-dir."""
    completed = CompletedProcess(
        args=[], returncode=137, stdout="boom\n", stderr="segfault",
    )
    with patch("harness.run_all.subprocess.run", return_value=completed):
        result = invoke_child(
            scenario_dir=tmp_path / "foo", coding_agent="claude",
        )
    assert result.run_id is None
    assert result.exit_code == 137
    assert result.error is not None and "run-id" in result.error
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/harness/test_run_all.py -x -q`
Expected: FAIL — `invoke_child`, `ChildResult` not defined.

- [ ] **Step 3: Implement `invoke_child` + `ChildResult`**

Append to `harness/run_all.py`:

```python
import subprocess


@dataclass(frozen=True)
class ChildResult:
    """Outcome of one child `harness run` invocation.

    run_id: the run-dir basename printed by the child, or None if the child
      crashed before allocating one.
    exit_code: child process exit code (0=pass, 1=fail, 2=indeterminate;
      anything else = abnormal exit).
    error: short human-readable description when something went wrong at the
      *process* level (couldn't parse run-id, signal kill, etc.). A `fail`
      verdict — exit 1 with a valid run-id — is NOT an error.
    """
    run_id: str | None
    exit_code: int
    error: str | None


_RUN_ID_PREFIX = "run-id: "


def _parse_run_id(stdout: str) -> str | None:
    for line in stdout.splitlines():
        if line.startswith(_RUN_ID_PREFIX):
            return line[len(_RUN_ID_PREFIX):].strip()
    return None


def invoke_child(
    *,
    scenario_dir: Path,
    coding_agent: str,
    timeout_seconds: float | None = None,
) -> ChildResult:
    """Run one `harness run` as a subprocess; capture its run-id line."""
    cmd = [
        "uv", "run", "harness", "run",
        str(scenario_dir),
        "--coding-agent", coding_agent,
    ]
    try:
        completed = subprocess.run(
            cmd,
            capture_output=True, text=True, timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        return ChildResult(run_id=None, exit_code=-1, error="child timed out")

    run_id = _parse_run_id(completed.stdout)
    if run_id is None:
        return ChildResult(
            run_id=None, exit_code=completed.returncode,
            error=f"child did not print run-id (exit {completed.returncode})",
        )
    return ChildResult(run_id=run_id, exit_code=completed.returncode, error=None)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/harness/test_run_all.py -x -q`
Expected: PASS (8 tests total in this file).

- [ ] **Step 5: Commit**

```bash
git add harness/run_all.py tests/harness/test_run_all.py
git commit -m "harness: run_all child subprocess wrapper (invoke_child)

Co-Authored-By: Penric@eabdc077 (Opus 4.7)"
```

---

## Task 4: Batch directory + write helpers

**Why next:** The orchestrator needs to allocate a batch ID, write `batch.json` at start, append to `results.jsonl` as completions arrive, and update `batch.json` with `finished_at` when done. Isolated I/O helpers, unit-testable.

**Files:**
- Modify: `harness/run_all.py`
- Test: `tests/harness/test_run_all.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/harness/test_run_all.py`:

```python
import json
from datetime import datetime, timezone

from harness.run_all import (
    allocate_batch_dir,
    write_batch_header,
    write_batch_footer,
    append_result_record,
)


def test_allocate_batch_dir_creates_unique_dir(tmp_path):
    out_root = tmp_path / "results-harness"
    out_root.mkdir()

    batch_dir = allocate_batch_dir(out_root=out_root)

    assert batch_dir.parent == out_root / "batches"
    assert batch_dir.is_dir()
    # ID looks like 20260526T180000Z-abcd
    name = batch_dir.name
    assert name[8] == "T" and name.endswith("Z" + name[-5:])
    assert "-" in name


def test_write_batch_header_writes_batch_json(tmp_path):
    batch_dir = tmp_path / "batches" / "20260526T180000Z-abcd"
    batch_dir.mkdir(parents=True)

    started_at = datetime(2026, 5, 26, 18, 0, 0, tzinfo=timezone.utc)
    write_batch_header(
        batch_dir=batch_dir,
        coding_agents=["claude", "codex"],
        jobs=4,
        started_at=started_at,
    )

    data = json.loads((batch_dir / "batch.json").read_text())
    assert data["schema_version"] == 1
    assert data["id"] == "20260526T180000Z-abcd"
    assert data["coding_agents"] == ["claude", "codex"]
    assert data["jobs"] == 4
    assert data["started_at"] == "2026-05-26T18:00:00+00:00"
    assert data["finished_at"] is None


def test_write_batch_footer_sets_finished_at(tmp_path):
    batch_dir = tmp_path / "batches" / "20260526T180000Z-abcd"
    batch_dir.mkdir(parents=True)
    started_at = datetime(2026, 5, 26, 18, 0, 0, tzinfo=timezone.utc)
    write_batch_header(
        batch_dir=batch_dir, coding_agents=["claude"], jobs=1,
        started_at=started_at,
    )

    finished_at = datetime(2026, 5, 26, 18, 3, 41, tzinfo=timezone.utc)
    write_batch_footer(batch_dir=batch_dir, finished_at=finished_at)

    data = json.loads((batch_dir / "batch.json").read_text())
    assert data["finished_at"] == "2026-05-26T18:03:41+00:00"
    # Header fields preserved
    assert data["coding_agents"] == ["claude"]


def test_append_result_record_skipped(tmp_path):
    batch_dir = tmp_path / "batch"
    batch_dir.mkdir()

    append_result_record(
        batch_dir=batch_dir, scenario="foo", coding_agent="codex",
        run_id=None, skipped="directive",
    )

    lines = (batch_dir / "results.jsonl").read_text().splitlines()
    assert len(lines) == 1
    rec = json.loads(lines[0])
    assert rec == {
        "scenario": "foo", "coding_agent": "codex",
        "run_id": None, "skipped": "directive",
    }


def test_append_result_record_runnable(tmp_path):
    batch_dir = tmp_path / "batch"
    batch_dir.mkdir()

    append_result_record(
        batch_dir=batch_dir, scenario="foo", coding_agent="claude",
        run_id="foo-claude-20260526T180001Z-abcd", skipped=None,
    )

    rec = json.loads((batch_dir / "results.jsonl").read_text().splitlines()[0])
    assert rec == {
        "scenario": "foo", "coding_agent": "claude",
        "run_id": "foo-claude-20260526T180001Z-abcd",
    }
    assert "skipped" not in rec
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/harness/test_run_all.py -x -q`
Expected: FAIL — helpers not defined.

- [ ] **Step 3: Implement helpers**

Append to `harness/run_all.py`:

```python
import json
import secrets
from datetime import datetime, timezone


def _make_batch_id(now: datetime | None = None) -> str:
    now = now or datetime.now(timezone.utc)
    stamp = now.strftime("%Y%m%dT%H%M%SZ")
    nonce = secrets.token_hex(2)  # 4 hex chars, matches per-run convention
    return f"{stamp}-{nonce}"


def allocate_batch_dir(*, out_root: Path) -> Path:
    """Create results-harness/batches/<id>/ and return its path."""
    batches_root = out_root / "batches"
    batches_root.mkdir(parents=True, exist_ok=True)
    while True:
        candidate = batches_root / _make_batch_id()
        try:
            candidate.mkdir(exist_ok=False)
            return candidate
        except FileExistsError:
            continue  # nonce collision; try again


def write_batch_header(
    *,
    batch_dir: Path,
    coding_agents: list[str],
    jobs: int,
    started_at: datetime,
) -> None:
    """Write batch.json at the start of a batch. `finished_at` is null."""
    data = {
        "schema_version": 1,
        "id": batch_dir.name,
        "started_at": started_at.isoformat(),
        "finished_at": None,
        "coding_agents": coding_agents,
        "jobs": jobs,
    }
    (batch_dir / "batch.json").write_text(json.dumps(data, indent=2))


def write_batch_footer(*, batch_dir: Path, finished_at: datetime) -> None:
    """Update batch.json with `finished_at` when the batch completes."""
    path = batch_dir / "batch.json"
    data = json.loads(path.read_text())
    data["finished_at"] = finished_at.isoformat()
    path.write_text(json.dumps(data, indent=2))


def append_result_record(
    *,
    batch_dir: Path,
    scenario: str,
    coding_agent: str,
    run_id: str | None,
    skipped: str | None,
) -> None:
    """Append one record to results.jsonl. Only the main thread should call."""
    rec: dict = {"scenario": scenario, "coding_agent": coding_agent, "run_id": run_id}
    if skipped is not None:
        rec["skipped"] = skipped
    with (batch_dir / "results.jsonl").open("a") as f:
        f.write(json.dumps(rec) + "\n")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/harness/test_run_all.py -x -q`
Expected: PASS (13 tests total).

- [ ] **Step 5: Commit**

```bash
git add harness/run_all.py tests/harness/test_run_all.py
git commit -m "harness: run_all batch dir layout + write helpers

Co-Authored-By: Penric@eabdc077 (Opus 4.7)"
```

---

## Task 5: Orchestrator — scheduling + live progress

**Why next:** Top-level entry point that ties Tasks 2–4 together. ThreadPoolExecutor schedules pairs; the main thread serializes writes and progress prints.

**Files:**
- Modify: `harness/run_all.py`
- Test: `tests/harness/test_run_all.py`

- [ ] **Step 1: Write failing tests using an injected child runner**

Append to `tests/harness/test_run_all.py`:

```python
from harness.run_all import run_batch


def test_run_batch_writes_skipped_then_runnable(tmp_path, capsys):
    """Skipped entries are written upfront; runnable pairs appended on completion."""
    scenarios = tmp_path / "scenarios"
    agents = tmp_path / "agents"
    _scenario(scenarios, "alpha", directive="codex")  # claude skipped
    _scenario(scenarios, "beta")                      # both runnable
    _agent(agents, "claude")
    _agent(agents, "codex")
    out_root = tmp_path / "results-harness"

    def fake_invoke(*, scenario_dir, coding_agent, timeout_seconds=None):
        return ChildResult(
            run_id=f"{scenario_dir.name}-{coding_agent}-fakerun",
            exit_code=0, error=None,
        )

    batch_dir = run_batch(
        scenarios_root=scenarios,
        coding_agents_dir=agents,
        out_root=out_root,
        jobs=1,
        agent_filter=None,
        invoke=fake_invoke,
    )

    lines = (batch_dir / "results.jsonl").read_text().splitlines()
    records = [json.loads(l) for l in lines]
    # 1 skipped (alpha × claude) + 3 runnable = 4 records.
    assert len(records) == 4

    skipped = [r for r in records if r.get("skipped")]
    assert len(skipped) == 1
    assert skipped[0]["scenario"] == "alpha"
    assert skipped[0]["coding_agent"] == "claude"

    runnable = [r for r in records if r.get("run_id")]
    assert len(runnable) == 3
    assert all(r["run_id"].endswith("-fakerun") for r in runnable)


def test_run_batch_writes_batch_json_header_and_footer(tmp_path):
    scenarios = tmp_path / "scenarios"
    agents = tmp_path / "agents"
    _scenario(scenarios, "alpha")
    _agent(agents, "claude")
    out_root = tmp_path / "results-harness"

    def fake_invoke(*, scenario_dir, coding_agent, timeout_seconds=None):
        return ChildResult(run_id="alpha-claude-fake", exit_code=0, error=None)

    batch_dir = run_batch(
        scenarios_root=scenarios, coding_agents_dir=agents,
        out_root=out_root, jobs=1, agent_filter=None, invoke=fake_invoke,
    )

    data = json.loads((batch_dir / "batch.json").read_text())
    assert data["coding_agents"] == ["claude"]
    assert data["jobs"] == 1
    assert data["started_at"] is not None
    assert data["finished_at"] is not None


def test_run_batch_jobs_gt_one_runs_all_pairs(tmp_path):
    scenarios = tmp_path / "scenarios"
    agents = tmp_path / "agents"
    for n in ("a", "b", "c", "d"):
        _scenario(scenarios, n)
    _agent(agents, "claude")
    out_root = tmp_path / "results-harness"

    invocations: list[tuple[str, str]] = []

    def fake_invoke(*, scenario_dir, coding_agent, timeout_seconds=None):
        invocations.append((scenario_dir.name, coding_agent))
        return ChildResult(run_id=f"{scenario_dir.name}-{coding_agent}-x",
                           exit_code=0, error=None)

    batch_dir = run_batch(
        scenarios_root=scenarios, coding_agents_dir=agents,
        out_root=out_root, jobs=4, agent_filter=None, invoke=fake_invoke,
    )

    assert sorted(invocations) == [
        ("a", "claude"), ("b", "claude"), ("c", "claude"), ("d", "claude"),
    ]
    assert len((batch_dir / "results.jsonl").read_text().splitlines()) == 4
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/harness/test_run_all.py -x -q`
Expected: FAIL — `run_batch` not defined.

- [ ] **Step 3: Implement `run_batch`**

Append to `harness/run_all.py`:

```python
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable


# Default child runner. Swap via the `invoke` param for tests.
_default_invoke: Callable[..., ChildResult] = invoke_child


def run_batch(
    *,
    scenarios_root: Path,
    coding_agents_dir: Path,
    out_root: Path,
    jobs: int,
    agent_filter: list[str] | None,
    invoke: Callable[..., ChildResult] = _default_invoke,
    stream: "object" = None,  # writable file; defaults to sys.stdout
) -> Path:
    """Run the full batch. Returns the batch dir path."""
    if jobs < 1:
        raise ValueError(f"jobs must be >= 1, got {jobs}")
    out = stream or sys.stdout

    entries = build_matrix(
        scenarios_root=scenarios_root,
        coding_agents_dir=coding_agents_dir,
        agent_filter=agent_filter,
    )

    batch_dir = allocate_batch_dir(out_root=out_root)
    started_at = datetime.now(timezone.utc)

    runnable = [e for e in entries if e.runnable]
    skipped = [e for e in entries if not e.runnable]
    agents_in_batch = sorted({e.coding_agent for e in entries})

    write_batch_header(
        batch_dir=batch_dir,
        coding_agents=agents_in_batch,
        jobs=jobs,
        started_at=started_at,
    )

    print(
        f"batch {batch_dir.name} · {len(entries)} pairs "
        f"({len(runnable)} runnable, {len(skipped)} skipped by directive) "
        f"· --jobs {jobs}",
        file=out, flush=True,
    )

    # Skipped entries first — listed up front, never spawn.
    for e in skipped:
        directive = parse_coding_agents_directive(e.scenario_dir / "checks.sh") or []
        print(
            f"[skip] {e.scenario} × {e.coding_agent}   "
            f"(directive: requires {', '.join(directive)})",
            file=out, flush=True,
        )
        append_result_record(
            batch_dir=batch_dir, scenario=e.scenario,
            coding_agent=e.coding_agent, run_id=None, skipped="directive",
        )

    # Schedule runnable pairs. `start` lines are printed inside the worker so
    # they interleave correctly with `done` lines under --jobs N>1; a lock
    # serializes stdout writes so partial lines never collide.
    total = len(runnable)
    print_lock = threading.Lock()

    def _worker(idx: int, entry: MatrixEntry) -> tuple[int, MatrixEntry, ChildResult, float]:
        with print_lock:
            print(f"[{idx}/{total}] start  {entry.scenario} × {entry.coding_agent}",
                  file=out, flush=True)
        t0 = time.monotonic()
        result = invoke(scenario_dir=entry.scenario_dir,
                        coding_agent=entry.coding_agent)
        return idx, entry, result, time.monotonic() - t0

    with ThreadPoolExecutor(max_workers=jobs) as pool:
        futures = [pool.submit(_worker, i, e) for i, e in enumerate(runnable, 1)]
        for fut in as_completed(futures):
            idx, entry, result, elapsed = fut.result()
            glyph = _verdict_glyph_from_result(result, out_root)
            with print_lock:
                print(
                    f"[{idx}/{total}] done   {entry.scenario} × {entry.coding_agent}"
                    f"      → {glyph}      in {_fmt_duration(elapsed)}",
                    file=out, flush=True,
                )
            append_result_record(
                batch_dir=batch_dir,
                scenario=entry.scenario, coding_agent=entry.coding_agent,
                run_id=result.run_id, skipped=None,
            )

    finished_at = datetime.now(timezone.utc)
    write_batch_footer(batch_dir=batch_dir, finished_at=finished_at)

    counts = _tally_batch(batch_dir, out_root)
    print(
        f"batch done · {counts['pass']} ✓ · {counts['fail']} ✗ · "
        f"{counts['indeterminate']} ⊘ · {counts['skipped']} — "
        f"· wall {_fmt_duration((finished_at - started_at).total_seconds())}",
        file=out, flush=True,
    )
    try:
        artifacts_path = batch_dir.relative_to(Path.cwd())
    except ValueError:
        artifacts_path = batch_dir
    print(f"artifacts: {artifacts_path}", file=out, flush=True)
    return batch_dir


def _fmt_duration(seconds: float) -> str:
    seconds = int(seconds)
    if seconds < 60:
        return f"{seconds}s"
    m, s = divmod(seconds, 60)
    return f"{m}m{s:02d}s"


def _read_verdict(run_dir: Path) -> dict | None:
    """Read verdict.json for a run-id; return None if missing/unparseable."""
    p = run_dir / "verdict.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text())
    except json.JSONDecodeError:
        return None


def _verdict_glyph_from_result(result: ChildResult, out_root: Path) -> str:
    """Render an inline glyph for the live progress `done` line."""
    if result.error is not None or result.run_id is None:
        return "? error"
    verdict = _read_verdict(out_root / result.run_id)
    if verdict is None:
        return "? no verdict"
    final = verdict.get("final", "?")
    return {
        "pass": "✓ pass",
        "fail": "✗ fail",
        "indeterminate": "⊘ indeterminate",
    }.get(final, f"? {final}")


def _tally_batch(batch_dir: Path, out_root: Path) -> dict[str, int]:
    counts = {"pass": 0, "fail": 0, "indeterminate": 0, "skipped": 0, "unknown": 0}
    for line in (batch_dir / "results.jsonl").read_text().splitlines():
        rec = json.loads(line)
        if rec.get("skipped"):
            counts["skipped"] += 1
            continue
        verdict = _read_verdict(out_root / rec["run_id"]) if rec.get("run_id") else None
        if verdict is None:
            counts["unknown"] += 1
            continue
        counts[verdict.get("final", "unknown")] = counts.get(verdict.get("final", "unknown"), 0) + 1
    return counts
```

- [ ] **Step 4: Run tests**

Run: `uv run pytest tests/harness/test_run_all.py -x -q`
Expected: PASS (16 tests).

- [ ] **Step 5: Run the full suite**

Run: `uv run pytest -x -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add harness/run_all.py tests/harness/test_run_all.py
git commit -m "harness: run_all orchestrator (scheduling + live progress)

Co-Authored-By: Penric@eabdc077 (Opus 4.7)"
```

---

## Task 6: CLI wiring — `harness run-all` command

**Files:**
- Modify: `harness/cli.py`
- Test: `tests/harness/test_cli.py`

- [ ] **Step 1: Write the failing test**

Append to `tests/harness/test_cli.py`:

```python
def test_run_all_command_invokes_run_batch(tmp_path, monkeypatch):
    from click.testing import CliRunner
    from harness.cli import main

    captured = {}

    def fake_run_batch(**kwargs):
        captured.update(kwargs)
        return tmp_path / "results-harness" / "batches" / "fakebatch"

    monkeypatch.setattr("harness.cli.run_batch", fake_run_batch)

    # Minimum dirs to satisfy click.Path(exists=True) on the defaults.
    (tmp_path / "harness" / "scenarios").mkdir(parents=True)
    (tmp_path / "harness" / "coding-agents").mkdir(parents=True)
    monkeypatch.chdir(tmp_path)

    result = CliRunner().invoke(main, [
        "run-all", "--coding-agents", "claude,codex", "--jobs", "4",
    ])

    assert result.exit_code == 0, result.output
    assert captured["jobs"] == 4
    assert captured["agent_filter"] == ["claude", "codex"]


def test_run_all_jobs_must_be_positive(tmp_path, monkeypatch):
    from click.testing import CliRunner
    from harness.cli import main

    (tmp_path / "harness" / "scenarios").mkdir(parents=True)
    (tmp_path / "harness" / "coding-agents").mkdir(parents=True)
    monkeypatch.chdir(tmp_path)

    result = CliRunner().invoke(main, ["run-all", "--jobs", "0"])
    assert result.exit_code != 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest tests/harness/test_cli.py::test_run_all_command_invokes_run_batch -x -q`
Expected: FAIL — `run-all` command not registered.

- [ ] **Step 3: Register the command**

In `harness/cli.py`, add a top-level import:

```python
from harness.run_all import run_batch
```

And add the command alongside `run` / `list` / `new` / `check` / `show`:

```python
@main.command("run-all")
@click.option(
    "--coding-agents", "coding_agents_csv", default=None,
    help="CSV filter, e.g. claude,codex. Default: every YAML in harness/coding-agents/.",
)
@click.option(
    "--jobs", "jobs", default=1, type=click.IntRange(min=1),
    help="Worker pool size. Default 1. N>1 runs scenarios concurrently.",
)
@click.option(
    "--scenarios-root", default=_DEFAULT_SCENARIOS_ROOT, hidden=True,
    type=click.Path(exists=True, file_okay=False, path_type=Path),
)
@click.option(
    "--coding-agents-dir", default=_DEFAULT_CODING_AGENTS_DIR, hidden=True,
    type=click.Path(exists=True, file_okay=False, path_type=Path),
)
@click.option(
    "--out-root", default=_DEFAULT_OUT_ROOT, hidden=True,
    type=click.Path(path_type=Path),
)
def run_all_cmd(
    coding_agents_csv: str | None,
    jobs: int,
    scenarios_root: Path,
    coding_agents_dir: Path,
    out_root: Path,
) -> None:
    """Run every (scenario × Coding-Agent) pair, gated by `# coding-agents:`."""
    agent_filter = (
        [a.strip() for a in coding_agents_csv.split(",") if a.strip()]
        if coding_agents_csv else None
    )
    out_root.mkdir(parents=True, exist_ok=True)
    try:
        run_batch(
            scenarios_root=scenarios_root.resolve(),
            coding_agents_dir=coding_agents_dir.resolve(),
            out_root=out_root.resolve(),
            jobs=jobs,
            agent_filter=agent_filter,
        )
    except ValueError as e:
        click.echo(f"error: {e}", err=True)
        sys.exit(1)
```

Note: spec §1 drops `--scenarios-root`, `--coding-agents-dir`, and `--out-root` from the user-visible interface. They're kept as `hidden=True` Click options so tests can inject `tmp_path` fixtures and the E2E test (Task 9) can isolate to one scenario. Hidden options don't appear in `--help`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/harness/test_cli.py -x -q -k "run_all"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add harness/cli.py tests/harness/test_cli.py
git commit -m "harness: register \`run-all\` CLI command

Co-Authored-By: Penric@eabdc077 (Opus 4.7)"
```

---

## Task 7: Batch matrix renderer in `show.py`

**Why next:** With batches being written, we need a way to look at them. Renderer is a pure function over `batch.json` + `results.jsonl` + per-run `verdict.json` files.

**Files:**
- Modify: `harness/show.py`
- Test: `tests/harness/test_show.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/harness/test_show.py`:

```python
import json
from datetime import datetime, timezone
from pathlib import Path

from harness.show import render_batch


def _seed_batch(tmp_path: Path, *, agents: list[str], rows: list[dict]) -> Path:
    """Build a fake batch dir + sibling per-run dirs to test the renderer."""
    out_root = tmp_path / "results-harness"
    batch_dir = out_root / "batches" / "20260526T180000Z-abcd"
    batch_dir.mkdir(parents=True)
    (batch_dir / "batch.json").write_text(json.dumps({
        "schema_version": 1, "id": batch_dir.name,
        "started_at": "2026-05-26T18:00:00+00:00",
        "finished_at": "2026-05-26T18:03:41+00:00",
        "coding_agents": agents, "jobs": 1,
    }))
    lines = []
    for r in rows:
        lines.append(json.dumps(r))
        if r.get("run_id"):
            run_dir = out_root / r["run_id"]
            run_dir.mkdir(parents=True)
            (run_dir / "verdict.json").write_text(json.dumps({
                "final": r.pop("_verdict", "pass"),
                "final_reason": r.pop("_reason", "ok"),
                "gauntlet": {}, "checks": {}, "error": None,
            }))
    (batch_dir / "results.jsonl").write_text("\n".join(lines) + "\n")
    return batch_dir


def test_render_batch_matrix_two_agents(tmp_path):
    batch_dir = _seed_batch(tmp_path, agents=["claude", "codex"], rows=[
        {"scenario": "foo", "coding_agent": "claude",
         "run_id": "foo-claude-x", "_verdict": "pass"},
        {"scenario": "foo", "coding_agent": "codex",
         "run_id": None, "skipped": "directive"},
        {"scenario": "bar", "coding_agent": "claude",
         "run_id": "bar-claude-x", "_verdict": "fail"},
        {"scenario": "bar", "coding_agent": "codex",
         "run_id": "bar-codex-x", "_verdict": "indeterminate"},
    ])

    out = render_batch(batch_dir=batch_dir, results_root=tmp_path / "results-harness", color=False)

    assert "scenario" in out and "claude" in out and "codex" in out
    assert "✓ pass" in out
    assert "✗ fail" in out
    assert "⊘ indet" in out
    assert "— skip" in out
    assert "Legend:" in out
    # Tally line
    assert "1 ✓" in out and "1 ✗" in out and "1 ⊘" in out and "1 —" in out


def test_render_batch_missing_verdict_renders_question_glyph(tmp_path):
    batch_dir = _seed_batch(tmp_path, agents=["claude"], rows=[
        {"scenario": "foo", "coding_agent": "claude", "run_id": "ghost"},
    ])
    out = render_batch(batch_dir=batch_dir, results_root=tmp_path / "results-harness", color=False)
    assert "?" in out
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/harness/test_show.py -x -q -k "render_batch"`
Expected: FAIL — `render_batch` not defined.

- [ ] **Step 3: Implement the renderer**

Append to `harness/show.py`:

```python
_GLYPHS = {
    "pass":          ("✓", "pass"),
    "fail":          ("✗", "fail"),
    "indeterminate": ("⊘", "indet"),
    "skipped":       ("—", "skip"),
    "unknown":       ("?", "?"),
}


def render_batch(
    *,
    batch_dir: Path,
    results_root: Path,
    color: bool,
) -> str:
    """Render a batch as a scenario × agent matrix table."""
    batch = json.loads((batch_dir / "batch.json").read_text())
    rows = [
        json.loads(line)
        for line in (batch_dir / "results.jsonl").read_text().splitlines()
    ]

    agents = batch["coding_agents"]
    scenarios = sorted({r["scenario"] for r in rows})

    # Index: (scenario, agent) -> cell glyph + label
    cells: dict[tuple[str, str], tuple[str, str]] = {}
    counts = {"pass": 0, "fail": 0, "indeterminate": 0, "skipped": 0, "unknown": 0}
    for r in rows:
        key = (r["scenario"], r["coding_agent"])
        if r.get("skipped"):
            cells[key] = _GLYPHS["skipped"]
            counts["skipped"] += 1
            continue
        run_id = r.get("run_id")
        verdict_path = results_root / run_id / "verdict.json" if run_id else None
        if not verdict_path or not verdict_path.exists():
            cells[key] = _GLYPHS["unknown"]
            counts["unknown"] += 1
            continue
        try:
            v = json.loads(verdict_path.read_text())
        except json.JSONDecodeError:
            cells[key] = _GLYPHS["unknown"]
            counts["unknown"] += 1
            continue
        final = v.get("final", "unknown")
        cells[key] = _GLYPHS.get(final, _GLYPHS["unknown"])
        counts[final] = counts.get(final, 0) + 1

    # Width of the scenario column = longest scenario name.
    scen_w = max((len(s) for s in scenarios), default=8)
    scen_w = max(scen_w, len("scenario"))
    cell_w = 8  # accommodates "✓ pass", "⊘ indet", "— skip" etc.

    sep = "|" + "-" * (scen_w + 2) + "|" + "|".join("-" * (cell_w + 2) for _ in agents) + "|"
    header = (
        "| " + "scenario".ljust(scen_w) + " | "
        + " | ".join(a.ljust(cell_w) for a in agents) + " |"
    )

    lines: list[str] = []
    lines.append(
        f"batch {batch['id']} · started {batch['started_at']}"
        + (f" · finished {batch['finished_at']}" if batch.get('finished_at') else "")
    )
    lines.append("")
    lines.append(header)
    lines.append(sep)
    for s in scenarios:
        row_cells = []
        for a in agents:
            glyph, label = cells.get((s, a), _GLYPHS["unknown"])
            row_cells.append(f"{glyph} {label}".ljust(cell_w))
        lines.append("| " + s.ljust(scen_w) + " | " + " | ".join(row_cells) + " |")
    lines.append("")
    lines.append(
        "Legend: ✓ pass   ✗ fail   ⊘ indeterminate   "
        "— skipped (directive)   ? no verdict"
    )
    lines.append(
        f"{counts['pass']} ✓ · {counts['fail']} ✗ · "
        f"{counts['indeterminate']} ⊘ · {counts['skipped']} —"
        + (f" · {counts['unknown']} ?" if counts['unknown'] else "")
    )
    return "\n".join(lines) + "\n"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest tests/harness/test_show.py -x -q -k "render_batch"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add harness/show.py tests/harness/test_show.py
git commit -m "harness: render_batch — scenario × agent matrix view

Co-Authored-By: Penric@eabdc077 (Opus 4.7)"
```

---

## Task 8: CLI dispatch — `harness show <batch-id>` recognizes batches

**Files:**
- Modify: `harness/show.py` (small extension to `resolve_target`)
- Modify: `harness/cli.py` (dispatch in `show()`)
- Test: `tests/harness/test_show.py`, `tests/harness/test_cli.py`

- [ ] **Step 1: Write failing tests**

Append to `tests/harness/test_show.py`:

```python
def test_resolve_target_returns_batch_dir_for_batch_id(tmp_path):
    from harness.show import resolve_target

    out_root = tmp_path / "results-harness"
    batch_dir = out_root / "batches" / "20260526T180000Z-abcd"
    batch_dir.mkdir(parents=True)
    (batch_dir / "batch.json").write_text("{}")

    resolved = resolve_target("20260526T180000Z-abcd", results_root=out_root)
    assert resolved == batch_dir


def test_is_batch_dir(tmp_path):
    from harness.show import is_batch_dir

    batch_dir = tmp_path / "20260526T180000Z-abcd"
    batch_dir.mkdir()
    (batch_dir / "batch.json").write_text("{}")
    assert is_batch_dir(batch_dir) is True

    run_dir = tmp_path / "foo-claude-20260526T180000Z-abcd"
    run_dir.mkdir()
    (run_dir / "verdict.json").write_text("{}")
    assert is_batch_dir(run_dir) is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest tests/harness/test_show.py -x -q -k "batch"`
Expected: FAIL — `is_batch_dir` not defined; `resolve_target` doesn't look under `batches/`.

- [ ] **Step 3: Extend `show.py`**

Add to `harness/show.py`:

```python
def is_batch_dir(path: Path) -> bool:
    """A path is a batch dir if it contains batch.json."""
    return path.is_dir() and (path / "batch.json").exists()
```

In `resolve_target` (around `harness/show.py:30`), add a lookup under `<results_root>/batches/<target>/` BEFORE the existing prefix-match logic:

```python
    # Batch IDs: results-harness/batches/<id>/.
    if target is not None:
        batch_candidate = results_root / "batches" / target
        if is_batch_dir(batch_candidate):
            return batch_candidate
```

(Place this right after the early `target is None` branch and the explicit path branch; consult the existing function and slot it in before the prefix-match fallback. Do not change the prefix-match behavior for run-dir lookups.)

- [ ] **Step 4: Dispatch in the `show` command**

In `harness/cli.py`'s `show` function (around line 184-235), after resolving the target, check whether it's a batch dir and dispatch:

```python
    if is_batch_dir(run_dir):
        if mode_json:
            batch = json.loads((run_dir / "batch.json").read_text())
            results = [
                json.loads(l)
                for l in (run_dir / "results.jsonl").read_text().splitlines()
            ]
            click.echo(json.dumps({**batch, "results": results}, indent=2))
            return
        from harness.show import render_batch
        click.echo(
            render_batch(batch_dir=run_dir, results_root=results_root, color=color),
            nl=False,
        )
        return
```

(Place this directly after the existing `run_dir = resolve_target(...)` block and BEFORE the `verdict_path = run_dir / "verdict.json"` line, so single-run handling is unchanged for non-batch targets.)

Add `is_batch_dir` to the existing `from harness.show import …` line in `cli.py`.

- [ ] **Step 5: Write a CLI-level test**

Append to `tests/harness/test_cli.py`:

```python
def test_show_renders_batch_when_target_is_batch_id(tmp_path, monkeypatch):
    from click.testing import CliRunner
    import json
    from harness.cli import main

    out_root = tmp_path / "results-harness"
    batch_dir = out_root / "batches" / "20260526T180000Z-abcd"
    batch_dir.mkdir(parents=True)
    batch_dir.joinpath("batch.json").write_text(json.dumps({
        "schema_version": 1, "id": batch_dir.name,
        "started_at": "2026-05-26T18:00:00+00:00",
        "finished_at": "2026-05-26T18:03:41+00:00",
        "coding_agents": ["claude"], "jobs": 1,
    }))
    batch_dir.joinpath("results.jsonl").write_text(
        json.dumps({"scenario": "foo", "coding_agent": "claude",
                    "run_id": None, "skipped": "directive"}) + "\n"
    )

    result = CliRunner().invoke(main, [
        "show", "20260526T180000Z-abcd", "--results-root", str(out_root),
    ])
    assert result.exit_code == 0, result.output
    assert "Legend:" in result.output
    assert "— skip" in result.output
```

- [ ] **Step 6: Run all the tests**

Run: `uv run pytest -x -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add harness/show.py harness/cli.py tests/harness/test_show.py tests/harness/test_cli.py
git commit -m "harness: \`show <batch-id>\` dispatches to matrix renderer

Co-Authored-By: Penric@eabdc077 (Opus 4.7)"
```

---

## Task 9: End-to-end smoke test + docs

**Files:**
- Test: `tests/harness/test_run_all_e2e.py` (new)
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1: Write an E2E smoke test**

Create `tests/harness/test_run_all_e2e.py`:

```python
"""End-to-end smoke test for `harness run-all` against _smoke-hello-world.

Marked `slow` so it can be excluded from the default test pass; explicitly
run via `uv run pytest tests/harness/test_run_all_e2e.py`.
"""

from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

import pytest


pytestmark = pytest.mark.skipif(
    not os.environ.get("ANTHROPIC_API_KEY"),
    reason="needs a real ANTHROPIC_API_KEY to drive the coding-agent",
)


def test_run_all_smoke_jobs_1(tmp_path):
    """`harness run-all --coding-agents claude --jobs 1` against _smoke-hello-world."""
    repo_root = Path(__file__).resolve().parents[2]
    # Copy or symlink the existing scenario into a private scenarios root.
    scenarios = tmp_path / "scenarios"
    scenarios.mkdir()
    src = repo_root / "harness" / "scenarios" / "_smoke-hello-world"
    (scenarios / "_smoke-hello-world").symlink_to(src)

    out_root = tmp_path / "results-harness"
    out_root.mkdir()

    completed = subprocess.run(
        [
            "uv", "run", "harness", "run-all",
            "--coding-agents", "claude", "--jobs", "1",
            "--scenarios-root", str(scenarios),
            "--out-root", str(out_root),
        ],
        capture_output=True, text=True, cwd=repo_root,
        timeout=600,
    )

    assert completed.returncode == 0, completed.stderr
    batches = list((out_root / "batches").iterdir())
    assert len(batches) == 1
    batch_dir = batches[0]
    assert (batch_dir / "batch.json").exists()
    assert (batch_dir / "results.jsonl").exists()
    records = [
        json.loads(l)
        for l in (batch_dir / "results.jsonl").read_text().splitlines()
    ]
    assert len(records) == 1
    assert records[0]["scenario"] == "_smoke-hello-world"
    assert records[0]["coding_agent"] == "claude"
```

- [ ] **Step 2: Run the E2E (locally; CI may skip)**

Run: `uv run pytest tests/harness/test_run_all_e2e.py -x -q`
Expected: PASS (or skip when `ANTHROPIC_API_KEY` is absent).

- [ ] **Step 3: Update CLAUDE.md**

In `CLAUDE.md`, under the existing `## Harness commands` section, add a bullet:

```markdown
- **run all**: `uv run harness run-all [--coding-agents X,Y] [--jobs N]`
- **show batch**: `uv run harness show <batch-id>` (matrix view)
```

- [ ] **Step 4: Update README.md (if it documents harness commands)**

If `README.md` lists `harness run` / `harness show`, add `run-all` next to them with one short sentence: "Run every scenario × Coding-Agent pair filtered by the `# coding-agents:` directive."

- [ ] **Step 5: Run the full suite one more time**

Run: `uv run pytest -x -q`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/harness/test_run_all_e2e.py README.md CLAUDE.md
git commit -m "harness: \`run-all\` E2E smoke + docs

Co-Authored-By: Penric@eabdc077 (Opus 4.7)"
```

---

## Final verification

After Task 9:

- [ ] `uv run pytest -x -q` — green.
- [ ] `uv run ruff check` — clean.
- [ ] `uv run ruff format --check` — clean.
- [ ] `uv run ty check` — clean.
- [ ] Manual smoke: `uv run harness run-all --coding-agents claude --jobs 1` against `_smoke-hello-world` only (e.g. with a temporary scenarios root).
- [ ] `uv run harness show <batch-id>` renders the matrix as expected.

If any of these fail, do NOT mark the work complete. Diagnose the root cause and add follow-up tasks.
