"""End-to-end smoke test for `harness run-all` against _smoke-hello-world.

Skipped unless ANTHROPIC_API_KEY is set; explicitly run via
`uv run pytest tests/harness/test_run_all_e2e.py`.
"""

from __future__ import annotations

import json
import os
import shutil
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
    # Copy the scenario into a private scenarios root. shutil.copytree is
    # used instead of symlink because symlinks need admin on Windows and
    # the copy lets the test mutate scenario files without contaminating
    # the repo.
    scenarios = tmp_path / "scenarios"
    scenarios.mkdir()
    src = repo_root / "harness" / "scenarios" / "_smoke-hello-world"
    shutil.copytree(src, scenarios / "_smoke-hello-world")

    out_root = tmp_path / "results-harness"
    out_root.mkdir()

    completed = subprocess.run(
        [
            "uv",
            "run",
            "harness",
            "run-all",
            "--coding-agents",
            "claude",
            "--jobs",
            "1",
            "--scenarios-root",
            str(scenarios),
            "--out-root",
            str(out_root),
        ],
        capture_output=True,
        text=True,
        cwd=repo_root,
        timeout=600,
    )

    assert completed.returncode == 0, completed.stderr
    batches = list((out_root / "batches").iterdir())
    assert len(batches) == 1
    batch_dir = batches[0]
    assert (batch_dir / "batch.json").exists()
    assert (batch_dir / "results.jsonl").exists()
    records = [json.loads(line) for line in (batch_dir / "results.jsonl").read_text().splitlines()]
    assert len(records) == 1
    assert records[0]["scenario"] == "_smoke-hello-world"
    assert records[0]["coding_agent"] == "claude"
