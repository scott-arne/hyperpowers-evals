"""Smoke tests for the SUP-196 cost-baseline drill scenarios.

These scenarios are measurement instruments: D3 will run them end-to-end
against real backends to capture token-cost baselines for the SUP-191
user-reported cost patterns. The tests here only verify the YAML loads,
the setup helpers resolve, and the verify block has at least one
machine- or LLM-checkable assertion / criterion.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from drill.engine import ScenarioConfig
from setup_helpers import HELPER_REGISTRY

SCENARIOS_DIR = Path(__file__).parent.parent / "scenarios"

COST_SCENARIOS = [
    "cost-checkbox-over-trigger.yaml",
    "cost-spec-plan-duplication.yaml",
    "cost-trivial-task-review-fanout.yaml",
    "cost-tool-result-bloat.yaml",
]


@pytest.mark.parametrize("name", COST_SCENARIOS)
class TestCostScenarioYaml:
    def test_loads(self, name):
        cfg = ScenarioConfig.from_yaml(SCENARIOS_DIR / name)
        # scenario name in YAML matches filename stem
        assert cfg.scenario == Path(name).stem

    def test_has_required_fields(self, name):
        cfg = ScenarioConfig.from_yaml(SCENARIOS_DIR / name)
        assert cfg.scenario
        assert cfg.description.strip(), f"{name} missing description"
        assert cfg.user_posture in {"naive", "spec-aware"}
        assert cfg.setup, f"{name} missing setup block"
        assert cfg.turns, f"{name} has no turns"
        assert cfg.limits, f"{name} missing limits"

    def test_setup_helpers_resolve(self, name):
        cfg = ScenarioConfig.from_yaml(SCENARIOS_DIR / name)
        helpers = cfg.setup.get("helpers", [])
        assert helpers, f"{name} declares no setup helpers"
        for helper in helpers:
            assert helper in HELPER_REGISTRY, f"{name}: helper {helper!r} not in HELPER_REGISTRY"

    def test_limits_are_sensible(self, name):
        cfg = ScenarioConfig.from_yaml(SCENARIOS_DIR / name)
        max_turns = cfg.limits.get("max_turns")
        turn_timeout = cfg.limits.get("turn_timeout")
        assert isinstance(max_turns, int) and 1 <= max_turns <= 40, (
            f"{name}: max_turns={max_turns!r} outside the 1..40 cost-budget band"
        )
        assert isinstance(turn_timeout, int) and 30 <= turn_timeout <= 1800, (
            f"{name}: turn_timeout={turn_timeout!r} outside 30..1800s"
        )

    def test_has_assertion_or_criterion(self, name):
        cfg = ScenarioConfig.from_yaml(SCENARIOS_DIR / name)
        assert cfg.verify.assertions or cfg.verify.criteria, (
            f"{name}: verify block has neither assertions nor criteria"
        )


def test_all_cost_scenarios_present():
    for name in COST_SCENARIOS:
        assert (SCENARIOS_DIR / name).exists(), f"missing {name}"
