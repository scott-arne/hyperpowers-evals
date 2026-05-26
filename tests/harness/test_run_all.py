"""Tests for harness.run_all."""

from __future__ import annotations

from pathlib import Path

import pytest

from harness.run_all import build_matrix


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
