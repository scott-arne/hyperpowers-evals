#!/usr/bin/env python3
"""Tally the harness-confound attribution campaign against its pre-registration.

Run ids come from the launch logs in ``logs/`` (``arm-<letter>-*.out``, so a
replacement launch logged as ``arm-a-replace.out`` joins arm A); the pilot run
on the fixed harness is named here and not counted. Each run resolves to
``runs/<arm>/<run-id>/`` when archived, else ``results/<run-id>/`` in the evals
clone.

The questions and rules (``logs/preregistration.txt``): every comparison is a
two-sided Fisher exact test on pass counts, and "separated" means p < 0.05.
Q1 compares arm A with the paired control's treatment (0 of 10); Q2 compares
A with B; Q3 compares C with A and D with A, and a leak drives the
over-trigger when its arm is separated below A. A grader exit without a
result is void and replaced (at most 3 per arm); a harness setup failure is
void and relaunched; a coding-agent failure is a trial.

Per run, the readouts come from the launch record
(``gauntlet-agent/context/launch-agent``) and the session's main transcript
(subagent transcripts excluded): the plugin root, the model, the Claude Code
version, the entrypoint, whether the skill listing carried the brainstorming
description, whether the task tools were offered, which instruction files
were loaded, and the first tool call. A counted run that fails its arm's
manipulation check is reported and excluded from the counts.
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
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
PLUGIN_DIR = re.compile(r'^exec .*--plugin-dir "([^"]+)"', re.MULTILINE)
MODEL = re.compile(r'^exec .*--model "([^"]+)"', re.MULTILINE)
BRAINSTORM_DESC = "hyperpowers:brainstorming: You MUST use this"
HP = "/Users/johnss51/Development/agents/hyperpowers"
HP_6140 = "/Users/johnss51/.cache/hyperpowers/harness-attr/hp-6140"
AGENTS_MD = [f"{HP}/AGENTS.md", f"{HP}/evals/AGENTS.md"]
# What each arm's sessions must show: plugin root, entrypoint, instruction files.
ARMS: dict[str, tuple[str, str, str, list[str]]] = {
    "A": ("a-clean-6150", HP, "cli", []),
    "B": ("b-clean-6140", HP_6140, "cli", []),
    "C": ("c-entrypoint", HP, "sdk-ts", []),
    "D": ("d-agentsmd", HP, "cli", AGENTS_MD),
}
MODEL_ID = "claude-opus-5-5"
CC_VERSION = "2.1.287"
PILOT = "cost-checkbox-over-trigger-claude-auto-20261003T180729Z-3d43"
PAIRED_TREATMENT = (0, 10)
ALPHA = 0.05


def run_dir(arm_dir: str, run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param arm_dir: The arm directory under ``runs/``.
    :param run_id: The quorum run id.
    :returns: The directory holding the run's ``verdict.json``.
    """
    archived = HERE / "runs" / arm_dir / run_id
    return archived if archived.is_dir() else EVALS / "results" / run_id


def void_kind(verdict: dict[str, Any]) -> str | None:
    """Name a void attempt read from the verdict, which occupies no trial slot.

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


def main_transcript(run: Path) -> Path | None:
    """Find the session's main transcript, skipping subagent transcripts.

    :param run: The run directory.
    :returns: The transcript path, or None when the run has none.
    """
    found = sorted((run / "home" / ".claude" / "projects").glob("*/*.jsonl"))
    return found[0] if found else None


def readouts(run: Path) -> dict[str, Any]:
    """Read the launch record and the main transcript of one run.

    :param run: The run directory.
    :returns: The per-run readouts.
    """
    launch = (run / "gauntlet-agent" / "context" / "launch-agent").read_text()
    plugin = PLUGIN_DIR.search(launch)
    model = MODEL.search(launch)
    out: dict[str, Any] = {
        "plugin_dir": plugin.group(1) if plugin else None,
        "model": model.group(1) if model else None,
        "cc": None,
        "entrypoint": None,
        "desc": None,
        "tasks": False,
        "instructions": [],
        "first_tool": None,
        "brainstorm_called": False,
    }
    transcript = main_transcript(run)
    if transcript is None:
        return out
    for line in transcript.read_text().splitlines():
        entry = json.loads(line)
        out["cc"] = out["cc"] or entry.get("version")
        out["entrypoint"] = out["entrypoint"] or entry.get("entrypoint")
        att = entry.get("attachment") or {}
        kind = att.get("type")
        if kind == "skill_listing" and out["desc"] is None:
            out["desc"] = BRAINSTORM_DESC in str(att.get("content") or "")
        elif kind == "deferred_tools_delta" and "TaskCreate" in (att.get("addedNames") or []):
            out["tasks"] = True
        elif kind == "instructions" and not out["instructions"]:
            out["instructions"] = [f["path"] for f in att.get("files") or []]
        if entry.get("type") != "assistant":
            continue
        for block in entry["message"].get("content") or []:
            if block.get("type") != "tool_use":
                continue
            name = block["name"]
            skill = (block.get("input") or {}).get("skill")
            label = f"{name}({skill})" if skill else name
            out["first_tool"] = out["first_tool"] or label
            if skill and skill.endswith("brainstorming"):
                out["brainstorm_called"] = True
    return out


def manipulation_failures(arm: str, r: dict[str, Any]) -> list[str]:
    """List how a run departs from its arm's pre-registered conditions.

    :param arm: The arm letter.
    :param r: The run's row.
    :returns: One entry per failed condition; empty when the run qualifies.
    """
    _, root, entrypoint, instructions = ARMS[arm]
    expected = {
        "root": (r["plugin_dir"], root),
        "model": (r["model"], MODEL_ID),
        "cc": (r["cc"], CC_VERSION),
        "entrypoint": (r["entrypoint"], entrypoint),
        "instructions": (sorted(r["instructions"]), sorted(instructions)),
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
    return min(1.0, sum(p for x in range(lo, hi + 1) if (p := prob(x)) <= observed * (1 + 1e-9)))


def row(arm: str, run_id: str) -> dict[str, Any]:
    """Assemble one run's verdict and readouts.

    :param arm: The arm letter, or ``pilot``.
    :param run_id: The quorum run id.
    :returns: The row, with the verdict, void kind and readouts.
    """
    arm_dir = ARMS[arm][0] if arm in ARMS else arm
    run = run_dir(arm_dir, run_id)
    verdict = json.loads((run / "verdict.json").read_text())
    return {
        "arm": arm,
        "run_id": run_id,
        "final": verdict.get("final"),
        "void": void_kind(verdict),
        **readouts(run),
    }


def main() -> int:
    """Print every run's row, the counts, the three questions and the outcome.

    :returns: The process exit status.
    """
    rows = []
    for arm in ARMS:
        for log in sorted((HERE / "logs").glob(f"arm-{arm.lower()}-*.out")):
            rows += [row(arm, run_id) for run_id in RUN_ID.findall(log.read_text())]
    rows.append(row("pilot", PILOT))

    for r in rows:
        r["manip"] = manipulation_failures(r["arm"], r) if r["arm"] in ARMS else []
        short = "-".join(r["run_id"].rsplit("-", 2)[-2:])
        inst = ",".join(p.split("/agents/")[-1] for p in r["instructions"]) or "none"
        print(
            f"{r['arm']:5} {short:22} {r['final'] or '-':13} void={r['void'] or '-':11} "
            f"root={r['plugin_dir']} model={r['model']} cc={r['cc']} "
            f"entry={r['entrypoint']} desc={r['desc']} tasks={r['tasks']} inst={inst} "
            f"first={r['first_tool']} brainstorm={r['brainstorm_called']} "
            f"manip={'ok' if not r['manip'] else ';'.join(r['manip'])}"
        )

    print()
    counts: dict[str, tuple[int, int]] = {}
    for arm in ARMS:
        mine = [r for r in rows if r["arm"] == arm]
        voids = [r for r in mine if r["void"] is not None]
        excluded = [r for r in mine if r["void"] is None and r["manip"]]
        trials = [r for r in mine if r["void"] is None and not r["manip"]]
        passes = sum(r["final"] == "pass" for r in trials)
        counts[arm] = (passes, len(trials))
        print(
            f"arm {arm} ({ARMS[arm][0]}): {passes} of {len(trials)} pass, "
            f"{len(voids)} void, {len(excluded)} excluded by manipulation check"
        )

    def compare(label: str, x: tuple[int, int], y: tuple[int, int]) -> tuple[bool, bool]:
        p = fisher_two_sided(x, y)
        separated = p < ALPHA
        below = separated and x[0] / x[1] < y[0] / y[1]
        print(f"{label}: {x[0]}/{x[1]} vs {y[0]}/{y[1]}  p={p:.3g}  separated={separated}")
        return separated, below

    print()
    q1, _ = compare("Q1 A vs paired-control treatment", counts["A"], PAIRED_TREATMENT)
    compare("Q2 A vs B", counts["A"], counts["B"])
    _, c_below = compare("Q3 C vs A", counts["C"], counts["A"])
    _, d_below = compare("Q3 D vs A", counts["D"], counts["A"])

    if not q1:
        outcome = "A not separated from 0 of 10: item 1 proceeds, measured on the clean harness"
    elif c_below:
        outcome = "A separated, C separated below A: item 1 proceeds, measured with sdk-ts"
    elif d_below:
        outcome = "A separated, D separated below A, C not: item 1 closes as a harness artifact"
    else:
        outcome = "A separated, neither C nor D separated below A: no item 1 decision, follow-up"
    print(f"\noutcome: {outcome}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
