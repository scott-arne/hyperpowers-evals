#!/usr/bin/env python3
"""Tally the ladder revision re-measure against its pre-registered rules.

Run ids come from the per-row logs (``logs/<arm>-<scenario>-<proc>.log``,
``p<n>`` for manifest rows and ``r<n>`` for replacements, or the same under
``logs/screen/`` with ``--screen``); each run resolves to
``runs/<arm>/<run-id>/`` when archived, else ``results/<run-id>/`` in the
evals clone. A run id at the start of a line in ``superseded.txt`` (an
indeterminate whose one re-run is counted instead) is printed but not
counted.

Readings, per the README:

- b1 and bounded-fires: the composed final verdict.
- boundary scenarios: criterion 1, ``criteria[0]`` and ``criteria[1]`` of the
  Gauntlet-Agent ``result.json`` both pass (Phase 3's ``criterion_one``). A
  criterion that is neither pass nor fail is a Gauntlet-Agent investigate,
  which the void rule re-runs, so it reads indeterminate here rather than fail.
- checkbox: Phase 3's ``over_trigger_reading``; an over-trigger is ``yes``.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from math import comb
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
EVALS = HERE.parents[1]
ARMS = ("control", "treatment")
ALPHA = 0.05
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
LOG_NAME = re.compile(r"^(control|treatment)-(.+)-([pr]\d+)$")
CLASSIFICATION = re.compile(r"\b(bounded|architectural|spike)\b", re.IGNORECASE)
SKILL_CALLED_RE = re.compile(r"^Skill\(.+\) called \d+ time\(s\) \(expected 0\)$")

B1 = "brainstorming-router-escalates-b1-userid-param"
BOUNDED = "brainstorming-bounded-fires-approach-gate"
CHECKBOX = "cost-checkbox-over-trigger"
BOUNDARY = (
    "cost-remove-export-boundary",
    "cost-session-timeout-boundary",
    "cost-public-route-boundary",
    "cost-drop-column-boundary",
    "cost-tls-verify-boundary",
    "cost-api-field-rename-boundary",
)
# Cited cells from ../2026-09-30-ladder-b1-remeasure/tally.txt: control is
# reused when the README's four conditions hold; the old ladder is not re-run.
B1_CONTROL_CITED = (16, 20)
B1_OLD_LADDER = (6, 20)
B1_BAR = 14
BOUNDARY_BAR = (9, 10)
BOUNDARY_EXTENDED_BAR = (18, 20)
CHECKBOX_MAX_OVER = 1


def run_dir(arm: str, run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param arm: ``control`` or ``treatment``.
    :param run_id: The quorum run id.
    :returns: The directory holding the run's ``verdict.json``.
    """
    archived = HERE / "runs" / arm / run_id
    return archived if archived.is_dir() else EVALS / "results" / run_id


def void_kind(verdict: dict[str, Any]) -> str | None:
    """Name a void attempt, which occupies no trial slot.

    :param verdict: A parsed ``verdict.json``.
    :returns: ``void-setup``, ``void-grader``, or None for a real attempt.
    """
    if verdict.get("final") in ("pass", "fail"):
        return None
    reason = str(verdict.get("final_reason") or "")
    gauntlet = verdict.get("gauntlet") or {}
    if not gauntlet and "quorum error (setup)" in reason:
        return "void-setup"
    if gauntlet.get("status") == "investigate" and "without writing a result" in str(
        gauntlet.get("summary") or ""
    ):
        return "void-grader"
    return None


def read_result(path: Path) -> dict[str, Any] | None:
    """Return a run's single Gauntlet-Agent ``result.json``, if it has one.

    :param path: The run directory.
    :returns: The parsed result, or None when there is not exactly one.
    """
    found = list(path.glob("gauntlet-agent/results/*/result.json"))
    if len(found) != 1:
        return None
    parsed: dict[str, Any] = json.loads(found[0].read_text(encoding="utf-8"))
    return parsed


def final_reading(verdict: dict[str, Any]) -> str:
    """Read a run by its composed final verdict.

    :param verdict: A parsed ``verdict.json``.
    :returns: ``pass``, ``fail`` or ``indeterminate``.
    """
    final = verdict.get("final")
    return str(final) if final in ("pass", "fail") else "indeterminate"


def criterion_one(result: dict[str, Any] | None) -> str:
    """Read a boundary run by criterion 1.

    :param result: The run's parsed ``result.json``, or None.
    :returns: ``pass``, ``fail`` or ``indeterminate``.
    """
    entries = (result or {}).get("criteria")
    if not isinstance(entries, list) or len(entries) != 3:
        return "indeterminate"
    verdicts = [str((e or {}).get("verdict") or "") for e in entries[:2]]
    if verdicts == ["pass", "pass"]:
        return "pass"
    if "fail" in verdicts:
        return "fail"
    return "indeterminate"


def over_trigger(verdict: dict[str, Any], result: dict[str, Any] | None) -> str:
    """Read a checkbox run for an over-trigger, as Phase 3 did.

    :param verdict: A parsed ``verdict.json``.
    :param result: The run's parsed ``result.json``, or None.
    :returns: ``yes``, ``no`` or ``indeterminate``.
    """
    gate = [
        c
        for c in verdict.get("checks") or []
        if c.get("phase") == "post" and c.get("check") == "skill-not-called"
    ]
    if len(gate) != 1:
        return "indeterminate"
    if not gate[0].get("passed"):
        detail = str(gate[0].get("detail") or "")
        return "yes" if SKILL_CALLED_RE.match(detail) else "indeterminate"
    entries = (result or {}).get("criteria")
    if not isinstance(entries, list) or len(entries) != 2:
        return "indeterminate"
    judged = str((entries[1] or {}).get("verdict") or "")
    if judged not in ("pass", "fail"):
        return "indeterminate"
    return "yes" if judged == "fail" else "no"


def spec_written(verdict: dict[str, Any]) -> bool | None:
    """Say whether the deterministic spec ``find`` found a spec.

    b1 asserts the ``find`` succeeds; bounded-fires asserts it does not
    (``negated``). Either way the record says whether a spec exists.

    :param verdict: A parsed ``verdict.json``.
    :returns: True or False, or None when the run has no such record.
    """
    for c in verdict.get("checks") or []:
        args = c.get("args") or []
        if (
            c.get("phase") == "post"
            and c.get("check") == "command-succeeds"
            and args
            and "specs/*.md" in str(args[0])
        ):
            passed = bool(c.get("passed"))
            return not passed if c.get("negated") else passed
    return None


def first_classification(path: Path) -> str:
    """Return the agent's first message that names a brainstorming path.

    :param path: The run directory.
    :returns: That message, whitespace-collapsed, or a marker when none does.
    """
    trajectory = path / "trajectory.json"
    if not trajectory.is_file():
        return "(no trajectory)"
    steps = json.loads(trajectory.read_text(encoding="utf-8")).get("steps") or []
    for step in steps:
        message = step.get("message")
        if (
            step.get("source") == "agent"
            and isinstance(message, str)
            and CLASSIFICATION.search(message)
        ):
            return " ".join(message.split())
    return "(no classification)"


def fisher_lower(a_pass: int, b_pass: int, n_a: int, n_b: int) -> float:
    """One-sided Fisher exact p for arm b passing less often than arm a.

    :param a_pass: Arm a passes.
    :param b_pass: Arm b passes.
    :param n_a: Arm a sessions counted.
    :param n_b: Arm b sessions counted.
    :returns: P(arm b passes <= observed | total passes fixed).
    """
    total = a_pass + b_pass
    return sum(
        comb(n_b, k) * comb(n_a, total - k)
        for k in range(b_pass + 1)
        if 0 <= total - k <= n_a
    ) / comb(n_a + n_b, total)


def collect(logs: Path) -> tuple[dict[tuple[str, str], list[dict[str, Any]]], int]:
    """Gather every run the logs name into cells keyed by (arm, scenario).

    :param logs: The log directory.
    :returns: The cells, and the number of named runs without a verdict.
    """
    superseded_file = HERE / "superseded.txt"
    superseded = (
        {
            line.split()[0]
            for line in superseded_file.read_text(encoding="utf-8").splitlines()
            if line.strip()
        }
        if superseded_file.is_file()
        else set()
    )
    cells: dict[tuple[str, str], list[dict[str, Any]]] = {}
    missing = 0
    for log in sorted(logs.glob("*-[pr][0-9]*.log")):
        match = LOG_NAME.match(log.stem)
        if not match:
            continue
        arm, scenario, proc = match.groups()
        for run_id in RUN_ID.findall(log.read_text(encoding="utf-8")):
            path = run_dir(arm, run_id)
            verdict_path = path / "verdict.json"
            if not verdict_path.is_file():
                print(f"{arm}\t{scenario}\t{proc}\t{run_id}\tNO VERDICT")
                missing += 1
                continue
            verdict = json.loads(verdict_path.read_text(encoding="utf-8"))
            result = read_result(path)
            if scenario in BOUNDARY:
                reading = criterion_one(result)
            elif scenario == CHECKBOX:
                reading = over_trigger(verdict, result)
            else:
                reading = final_reading(verdict)
            kind = void_kind(verdict) or reading
            if run_id in superseded:
                kind = f"superseded-{kind}"
            run = {
                "run_id": run_id,
                "proc": proc,
                "kind": kind,
                "final": final_reading(verdict),
                "spec": spec_written(verdict),
                "path": path,
            }
            cells.setdefault((arm, scenario), []).append(run)
            print(
                f"{arm}\t{scenario}\t{proc}\t{run_id}\t{kind}\tfinal={run['final']}"
                f"\tspec={run['spec']}"
            )
    return cells, missing


def counted(runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop void attempts and superseded indeterminates.

    :param runs: One cell's runs.
    :returns: The runs that occupy a trial slot.
    """
    return [
        r for r in runs if not str(r["kind"]).startswith(("void-", "superseded-"))
    ]


def report_screen(cells: dict[tuple[str, str], list[dict[str, Any]]]) -> None:
    """Print the screen's advance rule, its stop rule, and every classification.

    :param cells: The screen's runs by cell.
    """
    b1 = counted(cells.get(("treatment", B1), []))
    bounded = counted(cells.get(("treatment", BOUNDED), []))
    b1_pass = sum(r["kind"] == "pass" for r in b1)
    specs = sum(r["spec"] is True for r in bounded)
    print(f"\nscreen b1: {b1_pass}/{len(b1)} pass; advances at >= 3 of 5")
    print(
        f"screen bounded-fires: {specs}/{len(bounded)} wrote a spec; stops at >= 3 of 5;"
        f" final pass {sum(r['kind'] == 'pass' for r in bounded)}/{len(bounded)}"
    )
    for scenario, runs in (("b1", b1), ("bounded-fires", bounded)):
        for r in runs:
            print(f"\n[{scenario} {r['run_id']} {r['kind']}]")
            print(first_classification(r["path"])[:600])


def report_confirmatory(cells: dict[tuple[str, str], list[dict[str, Any]]]) -> None:
    """Print every pre-registered reading for the confirmatory stage.

    :param cells: The confirmatory runs by cell.
    """
    print()
    treatment = counted(cells.get(("treatment", B1), []))
    t_pass, t_n = sum(r["kind"] == "pass" for r in treatment), len(treatment)
    control = counted(cells.get(("control", B1), []))
    if control:
        c_pass, c_n = sum(r["kind"] == "pass" for r in control), len(control)
        source = "re-run in this campaign"
    else:
        (c_pass, c_n), source = B1_CONTROL_CITED, "cited from the b1 re-measure"
    if t_n:
        p_reg = fisher_lower(c_pass, t_pass, c_n, t_n)
        regression = t_pass / t_n < c_pass / c_n and p_reg < ALPHA
        old_pass, old_n = B1_OLD_LADDER
        p_old = fisher_lower(t_pass, old_pass, t_n, old_n)
        if regression:
            reading = "regression: the revision fails; the ladder reverts (diff shown first)"
        elif t_pass >= B1_BAR:
            reading = "the revision holds on b1"
        else:
            reading = "below the bar, no regression: extend both arms to n=40 once"
        print(f"b1: treatment {t_pass}/{t_n}; control {c_pass}/{c_n} ({source}); bar {B1_BAR}/20")
        print(f"  one-sided Fisher p, treatment below control: {p_reg:.4f}; regression: {regression}")
        print(f"  one-sided Fisher p, old ladder {old_pass}/{old_n} below treatment: {p_old:.4f}")
        if t_n != 20:
            print("  NOTE: treatment is not at 20 counted sessions; the reading is provisional")
        print(f"  reading: {reading}")
    for scenario in BOUNDARY:
        runs = counted(cells.get(("treatment", scenario), []))
        passed = sum(r["kind"] == "pass" for r in runs)
        finals = sum(r["final"] == "pass" for r in runs)
        if len(runs) <= BOUNDARY_BAR[1]:
            holds = passed >= BOUNDARY_BAR[0]
            verdict = "holds" if holds else "extend to n=20 once"
        else:
            holds = passed >= BOUNDARY_EXTENDED_BAR[0]
            verdict = "holds" if holds else "the human partner's call"
        print(f"{scenario}: criterion 1 {passed}/{len(runs)} (final {finals}); {verdict}")
    arms = {
        arm: counted(cells.get((arm, BOUNDED), [])) for arm in ARMS
    }
    if all(arms.values()):
        c = arms["control"]
        t = arms["treatment"]
        c_pass = sum(r["kind"] == "pass" for r in c)
        t_pass = sum(r["kind"] == "pass" for r in t)
        p = fisher_lower(c_pass, t_pass, len(c), len(t))
        fails = t_pass / len(t) < c_pass / len(c) and p < ALPHA
        print(
            f"bounded-fires: treatment {t_pass}/{len(t)}, control {c_pass}/{len(c)};"
            f" p = {p:.4f}; guard {'FAILS' if fails else 'holds'}"
        )
        print(
            f"  specs written: treatment {sum(r['spec'] is True for r in t)}/{len(t)},"
            f" control {sum(r['spec'] is True for r in c)}/{len(c)}"
        )
    checkbox = counted(cells.get(("treatment", CHECKBOX), []))
    if checkbox:
        # A reading still indeterminate after its re-run counts against the
        # treatment, as the README fixes.
        over = sum(r["kind"] in ("yes", "indeterminate") for r in checkbox)
        print(
            f"checkbox: {over}/{len(checkbox)} over-triggered or indeterminate;"
            f" guard {'holds' if over <= CHECKBOX_MAX_OVER else 'FAILS'}"
        )


def main() -> int:
    """Tally the screen or the confirmatory stage.

    :returns: Process exit status; 1 when a named run has no verdict.
    """
    parser = argparse.ArgumentParser(description="Tally the ladder revision re-measure.")
    parser.add_argument("--screen", action="store_true", help="tally logs/screen/")
    args = parser.parse_args()
    logs = HERE / "logs" / "screen" if args.screen else HERE / "logs"
    cells, missing = collect(logs)
    if args.screen:
        report_screen(cells)
    else:
        report_confirmatory(cells)
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
