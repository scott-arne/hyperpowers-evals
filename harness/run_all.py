"""harness run-all — batch driver over `harness run`.

Constructs the (scenario × Coding-Agent) matrix, pre-filters pairs by the
`# coding-agents:` directive in each scenario's checks.sh, runs the
runnable pairs concurrently as child `harness run` processes, and writes a
minimal batch index under results-harness/batches/<id>/.
"""

from __future__ import annotations

import json
import secrets
import subprocess
import sys
import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import TextIO

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


def _discover_scenarios(scenarios_root: Path) -> list[Path]:
    """Mirror `harness list`: scenario dirs are children with story.md."""
    return sorted(d for d in scenarios_root.iterdir() if d.is_dir() and (d / "story.md").exists())


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
                f"unknown coding-agent(s): {', '.join(unknown)} (available: {', '.join(available)})"
            )
        agents = [a for a in available if a in agent_filter]
    else:
        agents = available

    entries: list[MatrixEntry] = []
    for scenario_dir in _discover_scenarios(scenarios_root):
        directive = parse_coding_agents_directive(scenario_dir / "checks.sh")
        for agent in agents:
            skipped = "directive" if directive is not None and agent not in directive else None
            entries.append(
                MatrixEntry(
                    scenario=scenario_dir.name,
                    coding_agent=agent,
                    scenario_dir=scenario_dir,
                    skipped_reason=skipped,
                )
            )
    entries.sort(key=lambda e: (e.scenario, e.coding_agent))
    return entries


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
            return line[len(_RUN_ID_PREFIX) :].strip()
    return None


def invoke_child(
    *,
    scenario_dir: Path,
    coding_agent: str,
    coding_agents_dir: Path,
    out_root: Path,
    timeout_seconds: float | None = None,
) -> ChildResult:
    """Run one `harness run` as a subprocess; capture its run-id line.

    `coding_agents_dir` and `out_root` are forwarded as explicit flags so
    the child doesn't rely on its own cwd-relative defaults.
    """
    cmd = [
        "uv",
        "run",
        "harness",
        "run",
        str(scenario_dir),
        "--coding-agent",
        coding_agent,
        "--coding-agents-dir",
        str(coding_agents_dir),
        "--out-root",
        str(out_root),
    ]
    try:
        completed = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        return ChildResult(run_id=None, exit_code=-1, error="child timed out")

    run_id = _parse_run_id(completed.stdout)
    if run_id is None:
        return ChildResult(
            run_id=None,
            exit_code=completed.returncode,
            error=f"child did not print run-id (exit {completed.returncode})",
        )
    return ChildResult(run_id=run_id, exit_code=completed.returncode, error=None)


def _make_batch_id(now: datetime | None = None) -> str:
    now = now or datetime.now(UTC)
    stamp = now.strftime("%Y%m%dT%H%M%SZ")
    nonce = secrets.token_hex(2)  # 4 hex chars, matches per-run convention
    return f"batch-{stamp}-{nonce}"


def allocate_batch_dir(*, out_root: Path) -> Path:
    """Create results-harness/batches/<id>/ and return its path."""
    batches_root = out_root / "batches"
    batches_root.mkdir(parents=True, exist_ok=True)
    for _ in range(100):
        candidate = batches_root / _make_batch_id()
        try:
            candidate.mkdir(exist_ok=False)
            return candidate
        except FileExistsError:
            continue  # nonce collision; try again
    raise RuntimeError(
        "could not allocate a unique batch id after 100 attempts "
        f"(clock or RNG malfunction?) in {batches_root}"
    )


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


def run_batch(
    *,
    scenarios_root: Path,
    coding_agents_dir: Path,
    out_root: Path,
    jobs: int,
    agent_filter: list[str] | None,
    invoke: Callable[..., ChildResult] | None = None,
    stream: TextIO | None = None,  # writable file; defaults to sys.stdout
) -> Path:
    """Run the full batch. Returns the batch dir path."""
    if jobs < 1:
        raise ValueError(f"jobs must be >= 1, got {jobs}")
    # Late-bind to invoke_child so monkeypatch.setattr("harness.run_all.invoke_child", ...)
    # works without needing to also pass `invoke=` explicitly.
    invoke = invoke or invoke_child
    out = stream or sys.stdout

    entries = build_matrix(
        scenarios_root=scenarios_root,
        coding_agents_dir=coding_agents_dir,
        agent_filter=agent_filter,
    )

    batch_dir = allocate_batch_dir(out_root=out_root)
    started_at = datetime.now(UTC)

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

    # Counts accumulate inline; no end-of-batch re-read of results.jsonl.
    counts = {"pass": 0, "fail": 0, "indeterminate": 0, "unknown": 0,
              "skipped": len(skipped)}

    def _worker(idx: int, entry: MatrixEntry) -> tuple[int, MatrixEntry, ChildResult, float]:
        with print_lock:
            print(f"[{idx}/{total}] start  {entry.scenario} × {entry.coding_agent}",
                  file=out, flush=True)
        t0 = time.monotonic()
        result = invoke(
            scenario_dir=entry.scenario_dir,
            coding_agent=entry.coding_agent,
            coding_agents_dir=coding_agents_dir,
            out_root=out_root,
        )
        return idx, entry, result, time.monotonic() - t0

    with ThreadPoolExecutor(max_workers=jobs) as pool:
        futures = [pool.submit(_worker, i, e) for i, e in enumerate(runnable, 1)]
        for fut in as_completed(futures):
            idx, entry, result, elapsed = fut.result()
            final = _final_status_for_result(result, out_root)
            counts[final] = counts.get(final, 0) + 1
            glyph = _GLYPH_FOR_FINAL.get(final, f"? {final}")
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

    finished_at = datetime.now(UTC)
    write_batch_footer(batch_dir=batch_dir, finished_at=finished_at)

    summary_line = (
        f"batch done · {counts['pass']} ✓ · {counts['fail']} ✗ · "
        f"{counts['indeterminate']} ⊘ · {counts['skipped']} —"
    )
    if counts["unknown"]:
        summary_line += f" · {counts['unknown']} ?"
    summary_line += (
        f" · wall {_fmt_duration((finished_at - started_at).total_seconds())}"
    )
    print(summary_line, file=out, flush=True)
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


_GLYPH_FOR_FINAL = {
    "pass":          "✓ pass",
    "fail":          "✗ fail",
    "indeterminate": "⊘ indeterminate",
    "unknown":       "? no verdict",
}


def _final_status_for_result(result: ChildResult, out_root: Path) -> str:
    """Map a child outcome to one of pass / fail / indeterminate / unknown."""
    if result.error is not None or result.run_id is None:
        return "unknown"
    verdict = _read_verdict(out_root / result.run_id)
    if verdict is None:
        return "unknown"
    final = verdict.get("final", "unknown")
    return final if final in ("pass", "fail", "indeterminate") else "unknown"
