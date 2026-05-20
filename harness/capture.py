"""Snapshot, diff, and normalize agent-under-test session-log directories."""

from __future__ import annotations

import json
from pathlib import Path

from harness.normalizers import (
    NORMALIZERS,
    filter_codex_logs_by_cwd,
    filter_pi_logs_by_cwd,
)


def snapshot_dir(log_dir: Path, glob: str) -> set[str]:
    if not log_dir.exists():
        return set()
    return {str(p.relative_to(log_dir)) for p in log_dir.glob(glob)}


def new_files_since(log_dir: Path, glob: str, snapshot: set[str]) -> list[Path]:
    if not log_dir.exists():
        return []
    current = {str(p.relative_to(log_dir)): p for p in log_dir.glob(glob)}
    return [current[k] for k in sorted(set(current) - snapshot)]


def capture_tool_calls(
    *,
    log_dir: Path,
    log_glob: str,
    snapshot: set[str],
    normalizer: str,
    run_dir: Path,
    launch_cwd: Path | None = None,
) -> Path:
    """Diff log_dir, filter by cwd if applicable, normalize, write JSONL.

    Always writes tool_calls.jsonl (empty if no new logs) so downstream
    assertions can rely on the file existing.

    launch_cwd is the directory the agent CLI was launched in. codex and
    pi share one session-log tree across runs, so their rollouts are
    attributed back by matching the cwd recorded in each session header.
    This must be the launch cwd, not the scenario workdir — a scenario
    may point the agent at a subdir via .harness-launch-cwd.
    """
    new = new_files_since(log_dir, log_glob, snapshot)
    if normalizer == "codex" and launch_cwd is not None:
        new = filter_codex_logs_by_cwd(new, str(launch_cwd))
    elif normalizer == "pi" and launch_cwd is not None:
        new = filter_pi_logs_by_cwd(new, str(launch_cwd))
    fn = NORMALIZERS[normalizer]
    out_path = run_dir / "tool_calls.jsonl"
    with out_path.open("w") as f:
        for path in new:
            for row in fn(path.read_text()):
                f.write(json.dumps(row) + "\n")
    return out_path
