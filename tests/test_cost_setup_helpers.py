"""Tests for the SUP-196 cost-baseline setup helpers.

Each helper is invoked on a fresh tmp dir; we assert the on-disk fixture
the helper promises (so a future refactor can't quietly drop a file the
scenario depends on).
"""

from __future__ import annotations

import subprocess
from pathlib import Path

from setup_helpers.cost_checkbox_page import create_cost_checkbox_page
from setup_helpers.cost_clean_repo import create_cost_clean_repo
from setup_helpers.cost_large_files import create_cost_large_files
from setup_helpers.cost_trivial_plan import create_cost_trivial_plan


def _git(args: list[str], cwd: Path) -> str:
    return subprocess.run(
        ["git", *args], cwd=cwd, capture_output=True, text=True, check=True
    ).stdout


class TestCheckboxPage:
    def test_creates_single_page(self, tmp_path):
        wd = tmp_path / "repo"
        create_cost_checkbox_page(wd)
        page = wd / "index.html"
        assert page.exists(), "index.html missing"
        body = page.read_text()
        # Page has an empty <main>, no checkbox yet - the agent's job in the
        # scenario is to add one.
        assert "<main" in body
        assert "checkbox" not in body.lower()

    def test_repo_is_clean_main(self, tmp_path):
        wd = tmp_path / "repo"
        create_cost_checkbox_page(wd)
        assert _git(["branch", "--show-current"], wd).strip() == "main"
        # No uncommitted changes after setup
        assert _git(["status", "--short"], wd).strip() == ""

    def test_helper_is_small(self):
        # Sanity-check the "~30 lines max" constraint from the brief.
        src = Path(__file__).parent.parent / "setup_helpers" / "cost_checkbox_page.py"
        loc = sum(
            1
            for line in src.read_text().splitlines()
            if line.strip() and not line.strip().startswith("#")
        )
        assert loc <= 40, f"cost_checkbox_page.py grew to {loc} non-comment LOC"


class TestCleanRepo:
    def test_creates_readme_with_cli_hint(self, tmp_path):
        wd = tmp_path / "repo"
        create_cost_clean_repo(wd)
        readme = wd / "README.md"
        assert readme.exists()
        text = readme.read_text().lower()
        assert "habit" in text and "cli" in text

    def test_repo_is_clean_main(self, tmp_path):
        wd = tmp_path / "repo"
        create_cost_clean_repo(wd)
        assert _git(["branch", "--show-current"], wd).strip() == "main"
        assert _git(["status", "--short"], wd).strip() == ""


class TestTrivialPlan:
    def test_creates_plan_and_app_js(self, tmp_path):
        wd = tmp_path / "repo"
        create_cost_trivial_plan(wd)
        app = wd / "src" / "app.js"
        assert app.exists()
        assert app.read_text().count("\n") <= 8, "src/app.js should be a tiny stub"

        plans = list((wd / "docs" / "superpowers" / "plans").glob("*.md"))
        assert len(plans) == 1, f"expected exactly one plan file, got {plans}"
        plan_text = plans[0].read_text()
        assert "console.log" in plan_text
        assert "src/app.js" in plan_text

    def test_plan_describes_a_single_task(self, tmp_path):
        wd = tmp_path / "repo"
        create_cost_trivial_plan(wd)
        plan = next((wd / "docs" / "superpowers" / "plans").glob("*.md"))
        # We use a "## Task" header convention; the plan must have exactly one.
        n_tasks = sum(1 for line in plan.read_text().splitlines() if line.startswith("## Task"))
        assert n_tasks == 1, f"plan should have exactly one task, got {n_tasks}"


class TestLargeFiles:
    def test_creates_five_large_source_files(self, tmp_path):
        wd = tmp_path / "repo"
        create_cost_large_files(wd)
        src_files = sorted((wd / "src").glob("*.js"))
        assert len(src_files) == 5, f"expected 5 source files, got {len(src_files)}"
        for f in src_files:
            n_lines = f.read_text().count("\n")
            assert 800 <= n_lines <= 1600, (
                f"{f.name} has {n_lines} lines, outside the 800..1600 target"
            )

    def test_total_size_in_target_range(self, tmp_path):
        wd = tmp_path / "repo"
        create_cost_large_files(wd)
        total = sum(f.stat().st_size for f in (wd / "src").glob("*.js"))
        # Brief asks for ~150KB / ~6000 lines. Allow a wide band.
        assert 80_000 <= total <= 400_000, f"src/ total size {total} outside the 80KB..400KB band"

    def test_repo_is_clean_main(self, tmp_path):
        wd = tmp_path / "repo"
        create_cost_large_files(wd)
        assert _git(["branch", "--show-current"], wd).strip() == "main"
        assert _git(["status", "--short"], wd).strip() == ""
