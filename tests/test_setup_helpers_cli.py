from pathlib import Path

from setup_helpers.cli import main

REPO_ROOT = Path(__file__).resolve().parents[1]


class TestSetupHelpersCli:
    def test_bad_usage_returns_2(self, capsys):
        assert main([]) == 2
        assert main(["frobnicate"]) == 2

    def test_missing_workdir_returns_1(self, monkeypatch, capsys):
        monkeypatch.delenv("HARNESS_WORKDIR", raising=False)
        assert main(["run", "create_base_repo"]) == 1
        assert "HARNESS_WORKDIR" in capsys.readouterr().err

    def test_unknown_helper_returns_1(self, monkeypatch, tmp_path, capsys):
        monkeypatch.setenv("HARNESS_WORKDIR", str(tmp_path))
        assert main(["run", "no_such_helper"]) == 1
        assert "unknown helper" in capsys.readouterr().err

    def test_non_workdir_helper_rejected(self, monkeypatch, tmp_path, capsys):
        # add_worktree's first param is repo_dir, not workdir — the CLI
        # only drives workdir-style scenario helpers.
        monkeypatch.setenv("HARNESS_WORKDIR", str(tmp_path))
        assert main(["run", "add_worktree"]) == 1
        assert "not a workdir-style helper" in capsys.readouterr().err

    def test_runs_workdir_helper(self, monkeypatch, tmp_path):
        wd = tmp_path / "wd"
        wd.mkdir()
        monkeypatch.setenv("HARNESS_WORKDIR", str(wd))
        monkeypatch.setenv("HARNESS_REPO_ROOT", str(REPO_ROOT))
        # create_base_repo needs template_dir — supplied by introspection.
        assert main(["run", "create_base_repo"]) == 0
        assert (wd / ".git").is_dir()

    def test_runs_multiple_helpers_in_order(self, monkeypatch, tmp_path):
        wd = tmp_path / "wd"
        wd.mkdir()
        monkeypatch.setenv("HARNESS_WORKDIR", str(wd))
        monkeypatch.setenv("HARNESS_REPO_ROOT", str(REPO_ROOT))
        assert main(["run", "create_base_repo", "add_stub_executing_plan"]) == 0
        assert (wd / ".git").is_dir()
        assert (wd / "docs/superpowers/plans/2024-01-15-auth-system.md").exists()
