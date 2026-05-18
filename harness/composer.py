"""Combine Gauntlet's screen-side verdict with assertion results.

Fixed all-must-pass: final=pass iff gauntlet=pass AND every assertion exits 0.
No per-scenario composition rule; see docs/gauntlet-migration.md "The Agent
/ Verifier collapse".
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

from harness.assertions import AssertionResult

GauntletStatus = Literal["pass", "fail", "investigate"]
AssertionStatus = Literal["pass", "fail"]
FinalStatus = Literal["pass", "fail"]


@dataclass(frozen=True)
class FinalVerdict:
    gauntlet: GauntletStatus
    assertions: AssertionStatus
    final: FinalStatus
    assertion_details: list[dict] = field(default_factory=list)

    def to_dict(self) -> dict:
        return asdict(self)


def compose(
    *,
    gauntlet_status: GauntletStatus,
    assertion_results: list[AssertionResult],
) -> FinalVerdict:
    assertions: AssertionStatus = (
        "pass" if all(r.passed for r in assertion_results) else "fail"
    )
    final: FinalStatus = (
        "pass" if gauntlet_status == "pass" and assertions == "pass" else "fail"
    )
    return FinalVerdict(
        gauntlet=gauntlet_status,
        assertions=assertions,
        final=final,
        assertion_details=[
            {"name": r.name, "exit_code": r.exit_code, "stdout": r.stdout,
             "stderr": r.stderr}
            for r in assertion_results
        ],
    )
