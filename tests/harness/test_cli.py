# tests/harness/test_cli.py
from unittest.mock import MagicMock, patch

from click.testing import CliRunner

from harness.cli import main


def test_list_finds_scenarios(tmp_path):
    scenarios = tmp_path / "scenarios"
    (scenarios / "alpha").mkdir(parents=True)
    (scenarios / "alpha" / "story.md").write_text("---\nid: alpha\n---\n")
    (scenarios / "beta").mkdir()
    (scenarios / "beta" / "story.md").write_text("---\nid: beta\n---\n")
    (scenarios / "not-a-scenario").mkdir()  # no story.md
    runner = CliRunner()
    result = runner.invoke(main, ["list", "--scenarios-root", str(scenarios)])
    assert result.exit_code == 0
    assert "alpha" in result.output
    assert "beta" in result.output
    assert "not-a-scenario" not in result.output


def test_run_invokes_run_scenario(tmp_path):
    sd = tmp_path / "scenarios" / "x"
    sd.mkdir(parents=True)
    (sd / "story.md").write_text("---\nid: x\n---\n")
    runner = CliRunner()
    with patch("harness.cli.run_scenario") as mock:
        mock.return_value = MagicMock(final="pass", to_dict=lambda: {"final": "pass"})
        result = runner.invoke(main, [
            "run", str(sd),
            "--target", "claude",
            "--targets-dir", str(tmp_path / "t"),
            "--contexts-dir", str(tmp_path / "c"),
            "--out-root", str(tmp_path / "out"),
            "--bin-dir", str(tmp_path / "bin"),
        ])
        assert result.exit_code == 0
        mock.assert_called_once()
