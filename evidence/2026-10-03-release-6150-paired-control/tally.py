#!/usr/bin/env python3
"""Tally the v6.15.0 paired control against its pre-registered rule.

Run ids come from the launch logs in ``logs/`` (``arm-a-v6140.out`` for the
control, ``arm-b-5bef46c.out`` for the treatment, ``side-c-tdd.out`` and
``side-d-notodo.out`` for the side runs); the two sentinel runs that started
the campaign are named here. Each run resolves to ``runs/<arm>/<run-id>/``
when archived, else ``results/<run-id>/`` in the evals clone.

The decision rule (``logs/paired-preregistration.txt``): tag v6.15.0 if the
treatment's pass count is at least the control's. A grader exit without a
result is void and replaced (at most 3 per arm); a harness setup failure is
void and relaunched; a coding-agent failure is a trial.

Per run, the readouts come from the launch record
(``gauntlet-agent/context/launch-agent``) and the session's main transcript
(subagent transcripts excluded): the plugin root, the model, the Claude Code
version, whether the skill listing carried the brainstorming description,
whether the task tools were offered, which instruction files were loaded, and
the first tool call. They carry no reading of their own.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
EVALS = HERE.parents[1]
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
PLUGIN_DIR = re.compile(r'^exec .*--plugin-dir "([^"]+)"', re.MULTILINE)
MODEL = re.compile(r'^exec .*--model "([^"]+)"', re.MULTILINE)
BRAINSTORM_DESC = "hyperpowers:brainstorming: You MUST use this"
ARMS = {
    "control": ["arm-a-v6140.out"],
    "treatment": ["arm-b-5bef46c.out"],
    "side": ["side-c-tdd.out", "side-d-notodo.out"],
}
SENTINEL = [
    "cost-checkbox-over-trigger-claude-auto-20261003T112329Z-7629",
    "triggering-test-driven-development-claude-auto-20261003T112329Z-0176",
]
ROOTS = {
    "control": "/Users/johnss51/.cache/hyperpowers/release-6150/hp-6140",
    "treatment": "/Users/johnss51/Development/agents/hyperpowers",
}


def run_dir(arm: str, run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param arm: The arm directory under ``runs/``.
    :param run_id: The quorum run id.
    :returns: The directory holding the run's ``verdict.json``.
    """
    archived = HERE / "runs" / arm / run_id
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


def row(arm: str, run_id: str) -> dict[str, Any]:
    """Assemble one run's verdict and readouts.

    :param arm: The arm directory under ``runs/``.
    :param run_id: The quorum run id.
    :returns: The row, with the verdict, void kind and readouts.
    """
    run = run_dir(arm, run_id)
    verdict = json.loads((run / "verdict.json").read_text())
    return {
        "arm": arm,
        "run_id": run_id,
        "final": verdict.get("final"),
        "void": void_kind(verdict),
        **readouts(run),
    }


def main() -> int:
    """Print every run's row, then the decision.

    :returns: The process exit status.
    """
    rows = []
    for arm, logs in ARMS.items():
        for log in logs:
            for run_id in RUN_ID.findall((HERE / "logs" / log).read_text()):
                rows.append(row(arm, run_id))
    rows += [row("sentinel", run_id) for run_id in SENTINEL]

    for r in rows:
        short = r["run_id"].rsplit("-", 2)[-2:]
        inst = ",".join(p.split("/agents/")[-1] for p in r["instructions"])
        print(
            f"{r['arm']:9} {'-'.join(short):22} {r['final'] or '-':12} "
            f"void={r['void'] or '-':11} root={r['plugin_dir']} model={r['model']} "
            f"cc={r['cc']} desc={r['desc']} tasks={r['tasks']} "
            f"first={r['first_tool']} brainstorm={r['brainstorm_called']} inst={inst}"
        )

    print()
    counts: dict[str, tuple[int, int]] = {}
    for arm in ("control", "treatment"):
        trials = [r for r in rows if r["arm"] == arm and r["void"] is None]
        voids = [r for r in rows if r["arm"] == arm and r["void"] is not None]
        passes = sum(r["final"] == "pass" for r in trials)
        roots_ok = all(r["plugin_dir"] == ROOTS[arm] for r in trials + voids)
        counts[arm] = (passes, len(trials))
        print(
            f"{arm}: {passes} of {len(trials)} pass, {len(voids)} void, "
            f"every root {ROOTS[arm]}: {roots_ok}"
        )
    tag = counts["treatment"][0] >= counts["control"][0]
    print(f"decision: treatment passes >= control passes: {tag} -> {'tag' if tag else 'hold'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
