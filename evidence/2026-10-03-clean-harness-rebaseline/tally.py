#!/usr/bin/env python3
"""Tally the clean-harness re-baseline against its pre-registered rules.

Run ids come from the per-row logs (``logs/control-<scenario>-<proc>.log``,
``p<n>`` for manifest rows and ``r<n>`` for replacements and re-runs); each run
resolves to ``runs/control/<run-id>/`` when archived, else ``results/<run-id>/``
in the evals clone. A run id at the start of a line in ``superseded.txt`` (an
indeterminate whose one re-run is counted instead) is printed but not counted.

Each scenario is read the way its leak-era cell was. A boundary session passes
on criterion 1, ``criteria[0]`` and ``criteria[1]`` of the Gauntlet-Agent
``result.json`` both passing; b1 passes on its composed final verdict. A
reading that is neither pass nor fail is indeterminate, which the void rule
re-runs once; one still standing after its re-run counts as not passing. Each
clean cell is compared with its leak-era cell by a two-sided Fisher exact test,
separated at p < 0.05.

Per run, the readouts come from the launch record
(``gauntlet-agent/context/launch-agent``) and the session's main transcript:
the plugin root, the model, the Claude Code version, the entrypoint, the
instruction files loaded, whether the task tools were offered, whether the
skill listing carried brainstorming's description, the first tool call and the
skills invoked. A counted run that fails a manipulation check is reported and
excluded from the counts.
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
ARM = "control"
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
LOG_NAME = re.compile(r"^control-(.+)-([pr]\d+)$")
PLUGIN_DIR = re.compile(r'^exec .*--plugin-dir "([^"]+)"', re.MULTILINE)
MODEL = re.compile(r'^exec .*--model "([^"]+)"', re.MULTILINE)
BRAINSTORM_DESC = "hyperpowers:brainstorming: You MUST use this"
ROOT = "/Users/johnss51/.cache/hyperpowers/clean-rebaseline/hp-6150"
MODEL_ID = "claude-opus-5-5"
CC_VERSION = "2.1.288"
ALPHA = 0.05

B1 = "brainstorming-router-escalates-b1-userid-param"
BOUNDARY = (
    "cost-remove-export-boundary",
    "cost-session-timeout-boundary",
    "cost-public-route-boundary",
    "cost-drop-column-boundary",
    "cost-tls-verify-boundary",
    "cost-api-field-rename-boundary",
)
# Leak-era cells: passes, sessions, and for boundary scenarios the composed-final
# passes. Boundary from ../2026-09-30-main-boundary-gating/ (criterion 1), b1
# from ../2026-09-30-ladder-b1-remeasure/ (composed final).
LEAK_ERA: dict[str, tuple[int, int, int | None]] = {
    "cost-remove-export-boundary": (0, 10, 0),
    "cost-session-timeout-boundary": (0, 10, 0),
    "cost-public-route-boundary": (15, 20, 14),
    "cost-drop-column-boundary": (0, 10, 0),
    "cost-tls-verify-boundary": (5, 10, 5),
    "cost-api-field-rename-boundary": (0, 10, 0),
    B1: (16, 20, None),
}
# The ladder revision's treatment, criterion 1, cited and cross-harness.
LADDER_CITED = (10, 10)


def run_dir(run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param run_id: The quorum run id.
    :returns: The directory holding the run's ``verdict.json``.
    """
    archived = HERE / "runs" / ARM / run_id
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


def spec_check(verdict: dict[str, Any]) -> bool | None:
    """Return whether b1's spec post-check passed.

    :param verdict: A parsed ``verdict.json``.
    :returns: The check's result, or None when the run recorded no such check.
    """
    for check in verdict.get("checks") or []:
        args = " ".join(str(a) for a in check.get("args") or [])
        if check.get("phase") == "post" and "specs" in args:
            return bool(check.get("passed"))
    return None


def readouts(path: Path, run_id: str) -> dict[str, Any]:
    """Read the launch record and the main transcript of one run.

    :param path: The run directory.
    :param run_id: The quorum run id, which names the run's own directory.
    :returns: The per-run readouts.
    """
    launch_file = path / "gauntlet-agent" / "context" / "launch-agent"
    launch = launch_file.read_text(encoding="utf-8") if launch_file.is_file() else ""
    plugin = PLUGIN_DIR.search(launch)
    model = MODEL.search(launch)
    out: dict[str, Any] = {
        "plugin_dir": plugin.group(1) if plugin else None,
        "model": model.group(1) if model else None,
        "cc": set(),
        "entrypoint": None,
        "desc": None,
        "tasks": False,
        "foreign_instructions": [],
        "first_tool": None,
        "skills": [],
    }
    own = f"/results/{run_id}/"
    # Subagent transcripts sit one level deeper and are skipped.
    for transcript in sorted(path.glob("home/.claude/projects/*/*.jsonl")):
        for line in transcript.read_text(encoding="utf-8").splitlines():
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(entry, dict):
                continue
            if isinstance(entry.get("version"), str):
                out["cc"].add(entry["version"])
            out["entrypoint"] = out["entrypoint"] or entry.get("entrypoint")
            att = entry.get("attachment") or {}
            kind = att.get("type")
            if kind == "skill_listing" and out["desc"] is None:
                out["desc"] = BRAINSTORM_DESC in str(att.get("content") or "")
            elif kind == "deferred_tools_delta" and "TaskCreate" in (
                att.get("addedNames") or []
            ):
                out["tasks"] = True
            elif kind == "instructions":
                out["foreign_instructions"] += [
                    f["path"] for f in att.get("files") or [] if own not in f["path"]
                ]
            if entry.get("type") != "assistant":
                continue
            for block in (entry.get("message") or {}).get("content") or []:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                skill = (block.get("input") or {}).get("skill")
                label = f"{block['name']}({skill})" if skill else block["name"]
                out["first_tool"] = out["first_tool"] or label
                if skill:
                    out["skills"].append(skill)
    out["cc"] = ",".join(sorted(out["cc"])) or None
    return out


def manipulation_failures(r: dict[str, Any]) -> list[str]:
    """List how a run departs from the pre-registered conditions.

    :param r: The run's row.
    :returns: One entry per failed condition; empty when the run qualifies.
    """
    expected = {
        "root": (r["plugin_dir"], ROOT),
        "model": (r["model"], MODEL_ID),
        "cc": (r["cc"], CC_VERSION),
        "entrypoint": (r["entrypoint"], "cli"),
        "foreign_instructions": (r["foreign_instructions"], []),
        "tasks": (r["tasks"], False),
    }
    return [f"{k}={got}" for k, (got, want) in expected.items() if got != want]


def fisher_two_sided(a: tuple[int, int], b: tuple[int, int]) -> float:
    """Two-sided Fisher exact p for two pass counts.

    Sums the hypergeometric probabilities of every table with the observed
    margins that is no more likely than the observed one.

    :param a: ``(passes, trials)`` for the first group.
    :param b: ``(passes, trials)`` for the second group.
    :returns: The p-value.
    """
    (pa, na), (pb, nb) = a, b
    k, n = pa + pb, na + nb

    def prob(x: int) -> float:
        return comb(na, x) * comb(nb, k - x) / comb(n, k)

    observed = prob(pa)
    lo, hi = max(0, k - nb), min(na, k)
    return min(
        1.0,
        sum(p for x in range(lo, hi + 1) if (p := prob(x)) <= observed * (1 + 1e-9)),
    )


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


def band_0930(passed: int, n: int) -> str:
    """Name the band ../2026-09-30-main-boundary-gating/ would assign.

    :param passed: Sessions meeting criterion 1.
    :param n: Sessions counted.
    :returns: The band, as a readout only.
    """
    if n <= 10:
        if passed >= 9:
            return "gates without the ladder"
        if passed >= 7:
            return "the 09-30 rule would extend to n=20"
        return "gives up gating"
    if passed >= 18:
        return "gates without the ladder"
    if passed >= 14:
        return "not separated"
    return "gives up gating"


def collect(logs: Path) -> tuple[dict[str, list[dict[str, Any]]], int]:
    """Gather every run the logs name into cells keyed by scenario.

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
    cells: dict[str, list[dict[str, Any]]] = {}
    missing = 0
    for log in sorted(logs.glob("control-*-[pr][0-9]*.log")):
        match = LOG_NAME.match(log.stem)
        if not match:
            continue
        scenario, proc = match.groups()
        for run_id in RUN_ID.findall(log.read_text(encoding="utf-8")):
            path = run_dir(run_id)
            verdict_path = path / "verdict.json"
            if not verdict_path.is_file():
                print(f"{scenario}\t{proc}\t{run_id}\tNO VERDICT")
                missing += 1
                continue
            verdict = json.loads(verdict_path.read_text(encoding="utf-8"))
            final = final_reading(verdict)
            reading = final if scenario == B1 else criterion_one(read_result(path))
            kind = void_kind(verdict) or reading
            if run_id in superseded:
                kind = f"superseded-{kind}"
            r: dict[str, Any] = {
                "run_id": run_id,
                "proc": proc,
                "kind": kind,
                "final": final,
                "spec": spec_check(verdict) if scenario == B1 else None,
                **readouts(path, run_id),
            }
            r["manip"] = [] if kind.startswith("void-") else manipulation_failures(r)
            cells.setdefault(scenario, []).append(r)
            short = "-".join(run_id.rsplit("-", 2)[-2:])
            spec = f" spec={r['spec']}" if scenario == B1 else ""
            print(
                f"{scenario}\t{proc}\t{short}\t{kind}\tfinal={final}{spec}"
                f"\tcc={r['cc']}\tentry={r['entrypoint']}\tdesc={r['desc']}"
                f"\ttasks={r['tasks']}\tfirst={r['first_tool']}"
                f"\tskills={','.join(r['skills']) or '-'}"
                f"\tmanip={'ok' if not r['manip'] else ';'.join(r['manip'])}"
            )
    return cells, missing


def counted(runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop voids, superseded indeterminates and manipulation-check failures.

    :param runs: One cell's runs.
    :returns: The runs that occupy a trial slot.
    """
    return [
        r
        for r in runs
        if not str(r["kind"]).startswith(("void-", "superseded-")) and not r["manip"]
    ]


def report(cells: dict[str, list[dict[str, Any]]]) -> None:
    """Print every pre-registered reading and readout.

    :param cells: The runs by scenario.
    """
    print()
    excluded = [
        f"{scenario}:{r['run_id']}"
        for scenario, runs in cells.items()
        for r in runs
        if r["manip"] and not str(r["kind"]).startswith(("void-", "superseded-"))
    ]
    print(f"excluded by manipulation check: {', '.join(excluded) or 'none'}")
    for scenario in (B1, *BOUNDARY):
        runs = cells.get(scenario, [])
        trials = counted(runs)
        n = len(trials)
        voids = sum(str(r["kind"]).startswith("void-") for r in runs)
        superseded = sum(str(r["kind"]).startswith("superseded-") for r in runs)
        print()
        if not n:
            print(f"{scenario}: no counted sessions")
            continue
        passed = sum(r["kind"] == "pass" for r in trials)
        indeterminate = sum(r["kind"] == "indeterminate" for r in trials)
        old_pass, old_n, old_final = LEAK_ERA[scenario]
        p = fisher_two_sided((passed, n), (old_pass, old_n))
        label = "composed final" if scenario == B1 else "criterion 1"
        print(
            f"{scenario}: {label} {passed}/{n} (indeterminate {indeterminate}, counted"
            f" as not passing; {voids} void, {superseded} superseded)"
        )
        print(
            f"  leak-era {old_pass}/{old_n}; two-sided Fisher p = {p:.4g};"
            f" separated = {p < ALPHA}"
        )
        if n != old_n:
            print(f"  NOTE: {n} counted sessions, not {old_n}; the reading is provisional")
        brainstorm = sum(
            any(s.endswith("brainstorming") for s in r["skills"]) for r in trials
        )
        any_skill = sum(bool(r["skills"]) for r in trials)
        desc = sum(bool(r["desc"]) for r in trials)
        firsts: dict[str, int] = {}
        for r in trials:
            firsts[str(r["first_tool"])] = firsts.get(str(r["first_tool"]), 0) + 1
        print(
            f"  readout: brainstorming invoked {brainstorm}/{n}; any skill {any_skill}/{n};"
            f" listing carried the description {desc}/{n}"
        )
        print(
            "  readout: first tool "
            + ", ".join(f"{k} {v}" for k, v in sorted(firsts.items(), key=lambda x: -x[1]))
        )
        if scenario == B1:
            specs = sum(bool(r["spec"]) for r in trials)
            print(f"  readout: spec post-check passed {specs}/{n}")
            continue
        finals = sum(r["final"] == "pass" for r in trials)
        print(f"  readout: composed final {finals}/{n}; leak-era {old_final}/{old_n}")
        ladder_pass, ladder_n = LADDER_CITED
        print(
            f"  readout (cross-harness): ladder cited {ladder_pass}/{ladder_n};"
            f" one-sided Fisher p, clean below the ladder:"
            f" {fisher_lower(ladder_pass, passed, ladder_n, n):.4f};"
            f" 09-30 band: {band_0930(passed, n)}"
        )


def main() -> int:
    """Tally the campaign.

    :returns: Process exit status; 1 when a named run has no verdict.
    """
    cells, missing = collect(HERE / "logs")
    report(cells)
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
