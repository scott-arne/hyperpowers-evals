#!/usr/bin/env python3
"""Tally the ladder b1 re-measure against its pre-registered decision rule.

Run ids come from the per-row logs (``logs/<arm>-<scenario>-<proc>.log``,
``p<n>`` for manifest rows and ``r<n>`` for replacements); each run resolves
to ``runs/<arm>/<run-id>/`` when archived, else ``results/<run-id>/`` in the
evals clone. Setup voids in ``logs/void-setup/`` are listed, never counted.
A run id at the start of a line in ``superseded.txt`` (an indeterminate whose
one re-run is counted instead) is printed but not counted.
"""

from __future__ import annotations

import json
import re
import sys
from math import comb
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
EVALS = HERE.parents[1]
ARMS = ("control", "treatment")
BAR = 14
ALPHA = 0.05
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)


def run_ids(log: Path) -> list[str]:
    """Return the run ids a quorum log names, in order.

    :param log: A per-row launch log.
    :returns: The ``run-id:`` values it contains.
    """
    return RUN_ID.findall(log.read_text(encoding="utf-8"))


def run_dir(arm: str, run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param arm: ``control`` or ``treatment``.
    :param run_id: The quorum run id.
    :returns: The directory holding the run's ``verdict.json``.
    """
    archived = HERE / "runs" / arm / run_id
    return archived if archived.is_dir() else EVALS / "results" / run_id


def classify(verdict: dict[str, Any]) -> str:
    """Name what a verdict counts as under the pre-registered void rule.

    :param verdict: A parsed ``verdict.json``.
    :returns: ``pass``, ``fail``, ``void-setup``, ``void-grader`` or
        ``indeterminate``.
    """
    final = verdict.get("final")
    if final in ("pass", "fail"):
        return str(final)
    reason = str(verdict.get("final_reason") or "")
    gauntlet = verdict.get("gauntlet") or {}
    if not gauntlet and "quorum error (setup)" in reason:
        return "void-setup"
    if gauntlet.get("status") == "investigate" and "without writing a result" in str(
        gauntlet.get("summary") or ""
    ):
        return "void-grader"
    return "indeterminate"


def fisher_lower(
    control_pass: int, treatment_pass: int, n_control: int, n_treatment: int
) -> float:
    """One-sided Fisher exact p for treatment passing less often than control.

    :param control_pass: Control sessions that passed.
    :param treatment_pass: Treatment sessions that passed.
    :param n_control: Control sessions counted.
    :param n_treatment: Treatment sessions counted.
    :returns: P(treatment passes <= observed | total passes fixed).
    """
    total = control_pass + treatment_pass
    denominator = comb(n_control + n_treatment, total)
    return (
        sum(
            comb(n_treatment, k) * comb(n_control, total - k)
            for k in range(treatment_pass + 1)
            if 0 <= total - k <= n_control
        )
        / denominator
    )


def reading(control_pass: int, treatment_pass: int, regression: bool) -> str:
    """Map the counts to the README's pre-registered reading.

    :param control_pass: Control passes out of 20.
    :param treatment_pass: Treatment passes out of 20.
    :param regression: Whether the Fisher test flagged a regression.
    :returns: The table row that applies.
    """
    if regression:
        return (
            "regression: rung 1 is revised or the ladder reverts (human partner's call)"
        )
    if treatment_pass >= BAR:
        return "b1 clears; the Phase 3 miss was a small-sample draw"
    if control_pass < BAR:
        return "both arms below the bar, no regression: a brief or router issue, not the ladder's"
    return "treatment below the bar, control at it, not significant: extend both arms to n=40 once"


def main() -> int:
    """Print every counted run, the per-arm tally and the reading.

    :returns: Process exit status; 1 when a named run has no verdict.
    """
    counts: dict[str, dict[str, int]] = {arm: {} for arm in ARMS}
    missing = 0
    superseded_file = HERE / "superseded.txt"
    superseded = (
        {
            line.split()[0]
            for line in superseded_file.read_text().splitlines()
            if line.strip()
        }
        if superseded_file.is_file()
        else set()
    )
    for arm in ARMS:
        for log in sorted((HERE / "logs").glob(f"{arm}-*.log")):
            for run_id in run_ids(log):
                path = run_dir(arm, run_id) / "verdict.json"
                if not path.is_file():
                    print(f"{arm}\t{run_id}\tNO VERDICT")
                    missing += 1
                    continue
                verdict = json.loads(path.read_text(encoding="utf-8"))
                kind = classify(verdict)
                if run_id in superseded:
                    kind = f"superseded-{kind}"
                counts[arm][kind] = counts[arm].get(kind, 0) + 1
                posts = [
                    f"{c.get('check')}={'ok' if c.get('passed') else 'FAIL'}"
                    for c in verdict.get("checks") or []
                    if c.get("phase") == "post"
                ]
                trial = verdict.get("trial") or {}
                print(
                    f"{arm}\t{log.stem.rsplit('-', 1)[-1]}\t{trial.get('index')}\t{run_id}\t"
                    f"{kind}\tgauntlet={(verdict.get('gauntlet') or {}).get('status')}\t"
                    + " ".join(posts)
                )
    voids = sorted((HERE / "logs" / "void-setup").glob("*.log"))
    void_ids = [run_id for log in voids for run_id in run_ids(log)]
    print(f"\nsetup voids relaunched, not counted: {len(void_ids)}")
    for arm in ARMS:
        print(f"{arm}: {dict(sorted(counts[arm].items()))}")
    # A void attempt occupies no trial slot; an indeterminate that survived its
    # re-run counts as a session that did not pass.
    counted = {
        arm: sum(
            v
            for k, v in counts[arm].items()
            if not k.startswith(("void-", "superseded-"))
        )
        for arm in ARMS
    }
    passed = {arm: counts[arm].get("pass", 0) for arm in ARMS}
    print(f"counted: control {counted['control']}, treatment {counted['treatment']}")
    if min(counted.values()) == 0:
        return 1
    p = fisher_lower(
        passed["control"], passed["treatment"], counted["control"], counted["treatment"]
    )
    regression = (
        passed["treatment"] / counted["treatment"]
        < passed["control"] / counted["control"]
        and p < ALPHA
    )
    print(
        f"passed: control {passed['control']}/{counted['control']}, "
        f"treatment {passed['treatment']}/{counted['treatment']}; bar {BAR}/20"
    )
    print(
        f"one-sided Fisher p (treatment below control): {p:.4f}; regression: {regression}"
    )
    if counted["control"] != 20 or counted["treatment"] != 20:
        print(
            "NOTE: an arm is not at 20 counted sessions; the reading below is provisional"
        )
    print(f"reading: {reading(passed['control'], passed['treatment'], regression)}")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
