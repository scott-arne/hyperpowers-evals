# tests/quorum/test_file_exists.py
import json
import subprocess
from pathlib import Path

BIN = Path("bin").resolve()


def _run(*args: str, cwd: Path, sink: Path) -> int:
    return subprocess.run(
        [str(BIN / "file-exists"), *args],
        cwd=cwd,
        env={"PATH": f"{BIN}:/usr/bin:/bin", "QUORUM_RECORD_SINK": str(sink)},
        capture_output=True,
        text=True,
    ).returncode


def _r(sink):
    return json.loads(sink.read_text().splitlines()[-1])


def _tree(tmp_path: Path) -> Path:
    """A workdir with files at varying depths."""
    p = tmp_path / "w"
    (p / "cmd" / "fractals").mkdir(parents=True)
    (p / "internal" / "cli").mkdir(parents=True)
    (p / "cmd" / "fractals" / "main_test.go").write_text("package main\n")
    (p / "internal" / "cli" / "root_test.go").write_text("package cli\n")
    (p / "README.md").write_text("# readme\n")
    (p / "go.mod").write_text("module x\n")
    return p


def test_literal_path_present(tmp_path):
    w = _tree(tmp_path)
    sink = tmp_path / "s"
    assert _run("go.mod", cwd=w, sink=sink) == 0 and _r(sink)["passed"]


def test_literal_path_absent(tmp_path):
    w = _tree(tmp_path)
    sink = tmp_path / "s"
    assert _run("missing.txt", cwd=w, sink=sink) != 0 and not _r(sink)["passed"]


def test_single_star_glob_root(tmp_path):
    w = _tree(tmp_path)
    sink = tmp_path / "s"
    assert _run("*.md", cwd=w, sink=sink) == 0 and _r(sink)["passed"]


def test_recursive_glob_matches_nested_files(tmp_path):
    # Regression: bash 3.2 (macOS system bash) has no globstar, so a plain
    # `**` never recursed and this silently reported no match even though
    # the files exist two levels deep.
    w = _tree(tmp_path)
    sink = tmp_path / "s"
    assert _run("**/*_test.go", cwd=w, sink=sink) == 0 and _r(sink)["passed"]


def test_recursive_glob_no_match_fails(tmp_path):
    w = _tree(tmp_path)
    sink = tmp_path / "s"
    assert _run("**/*.svelte", cwd=w, sink=sink) != 0 and not _r(sink)["passed"]


def test_recursive_glob_with_prefix(tmp_path):
    w = _tree(tmp_path)
    sink = tmp_path / "s"
    assert _run("cmd/**/*.go", cwd=w, sink=sink) == 0 and _r(sink)["passed"]


def test_recursive_glob_slash_in_suffix(tmp_path):
    # Exercises the find -path branch (a slash survives after the **).
    w = _tree(tmp_path)
    sink = tmp_path / "s"
    assert _run("internal/**/cli/root_test.go", cwd=w, sink=sink) == 0 and _r(sink)["passed"]
