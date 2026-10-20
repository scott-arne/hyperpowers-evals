"""Tally the sdd-turn-liveness campaign against its pre-registered rule.

The rule is spec Design §2's decision rule, pre-registered in ``README.md``
before the first counted run. Inputs: ``manifest.tsv`` (the campaign pin as
two-field rows and every launch row, ``p<n>`` and replacement ``r<n>``), the
launch logs in ``logs/`` (one per launch row, written by
``logs/measure-launch.sh``), ``adjudications.tsv`` (hand labels for candidate
stops the Gauntlet-Agent's list did not match), and the runs, archived under
``task-11-runs/control/`` and ``task-12-runs/treatment/`` or still in the
clone's ``results/``. ``analyze.measure`` supplies every per-run number; this
module checks provenance, applies the void rules and counts.
"""

from __future__ import annotations

import re
import subprocess
import sys
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
EVALS = HERE.parents[1]
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import analyze

N = 10
VOID_CAP = 3
ARMS = ("control", "treatment")
SCENARIO = "sdd-turn-liveness"
ARCHIVE = {"control": HERE / "task-11-runs" / "control", "treatment": HERE / "task-12-runs" / "treatment"}
PIN_KEYS = (
    "harness", "control", "treatment", "control_root", "treatment_root", "model",
    "cc", "cc_path", "provider", "subagent_models", "codex", "task_tools",
)
HARNESS_PATHS = (
    "src", "coding-agents", "package.json", "bun.lock", "bunfig.toml", "tsconfig.json",
    "container", "scripts/evals-container", "scenarios", "fixtures",
)
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
TOKEN = re.compile(r"(\w+)=(\S+)")
LOG_NAME = re.compile(rf"^(control|treatment)-{SCENARIO}-([pr]\d+)\.log$")


@dataclass
class Launch:
    """One launch log: its arm, proc, header tokens, run ids and last line."""

    arm: str
    proc: str
    path: Path
    fields: dict[str, str] = field(default_factory=dict)
    run_ids: list[str] = field(default_factory=list)
    last: str = ""


def read_pins(manifest: Path) -> dict[str, str]:
    """The campaign pin: every two-field row of ``manifest.tsv``."""
    pins: dict[str, str] = {}
    for line in manifest.read_text().splitlines():
        fields = line.split("\t")
        if len(fields) == 2 and not line.startswith("#"):
            pins[fields[0]] = fields[1]
    missing = [k for k in PIN_KEYS if not pins.get(k) or "<" in pins[k]]
    if missing:
        raise ValueError(f"manifest.tsv lacks pin values for: {', '.join(missing)}")
    return pins


def read_rows(manifest: Path) -> list[tuple[str, str]]:
    """The (arm, proc) of every launch row for this scenario, in manifest order."""
    rows: list[tuple[str, str]] = []
    for line in manifest.read_text().splitlines():
        fields = line.split("\t")
        if len(fields) == 5 and fields[0] in ARMS and fields[1] == SCENARIO:
            rows.append((fields[0], fields[3]))
    return rows


def _proc_key(proc: str) -> tuple[str, int]:
    return proc[0], int(proc[1:])


def read_logs(logs: Path) -> list[Launch]:
    """Every launch log, p-rows before r-rows, then by number."""
    found: list[Launch] = []
    for path in logs.glob("*.log"):
        match = LOG_NAME.match(path.name)
        if not match:
            continue
        text = path.read_text(errors="replace")
        fields: dict[str, str] = {}
        for line in text.splitlines():
            if line.startswith(("run-id:", "$ ")):
                continue
            for key, value in TOKEN.findall(line):
                fields.setdefault(key, value)
        lines = text.rstrip("\n").splitlines()
        found.append(Launch(match.group(1), match.group(2), path, fields, RUN_ID.findall(text), lines[-1] if lines else ""))
    found.sort(key=lambda launch: _proc_key(launch.proc))
    return found


def harness_ok(commit: str | None, pin: str, repo: Path) -> bool:
    """Whether a run's evals commit is the harness pin, or descends from it with the harness paths unchanged.

    Evidence commits land between the arms (the control archive is committed
    before the treatment launches), so a treatment run's recorded commit is
    later than the pin; ``measure-launch.sh`` makes the same comparison
    before every launch.
    """
    if commit is None:
        return False
    if commit == pin:
        return True
    ancestor = subprocess.run(
        ["git", "-C", str(repo), "merge-base", "--is-ancestor", pin, commit], capture_output=True, check=False
    )
    if ancestor.returncode != 0:
        return False
    same = subprocess.run(
        ["git", "-C", str(repo), "diff", "--quiet", pin, commit, "--", *HARNESS_PATHS], capture_output=True, check=False
    )
    return same.returncode == 0


def _record(arm: str, run_id: str, results_root: Path, archive: Mapping[str, Path]) -> Path:
    archived = archive[arm] / run_id
    return archived if (archived / "verdict.json").is_file() else results_root / run_id


def _problems(m: Mapping[str, Any], arm: str, launch: Launch, pins: Mapping[str, str], repo: Path) -> list[str]:
    problems: list[str] = []
    f = launch.fields
    if not harness_ok(m["evals_commit"], pins["harness"], repo) or m["evals_clean"] is not True:
        problems.append("harness")
    if f.get("harness_pin") != pins["harness"]:
        problems.append("harness pin")
    if m["plugin_dir"] != pins[f"{arm}_root"]:
        problems.append("root path")
    if not (f.get("root_head") == f.get("root_after_head") == pins[arm] and f.get("root_clean") == f.get("root_after_clean") == "yes"):
        problems.append("root commit")
    if m["model"] != pins["model"]:
        problems.append("model")
    # Only a recorded version that differs from the pin restarts the campaign;
    # a version nobody recorded is a missing provenance field, which voids the run.
    versions = [m["cc"], f.get("cc_before"), f.get("cc_after")]
    if any(v is not None and v != pins["cc"] for v in versions):
        problems.append("cc")
    elif None in versions:
        problems.append("cc missing")
    if f.get("cc_path") != pins["cc_path"]:
        problems.append("cc path")
    if f.get("provider") != pins["provider"]:
        problems.append("provider")
    allowed = set(pins["subagent_models"].split(",")) | {pins["model"]}
    if not m["models"] or pins["model"] not in m["models"] or not set(m["models"]) <= allowed:
        problems.append("models")
    if pins["codex"] == "absent" and not m["codex_absent"]:
        problems.append("codex")
    if pins["task_tools"] == "on" and not m["task_tools"]:
        problems.append("task tools")
    return problems


def decide(control: Sequence[Mapping[str, Any]], treatment: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Apply W1, W2, F, U, P and R (spec Design §2) to ten counted runs per arm."""
    fg = sum(r["dispatch_fg"] for r in treatment)
    other = sum(r["dispatch_bg"] + r["dispatch_unclassified"] for r in treatment)
    share = fg / (fg + other) if fg + other else 0.0
    live = sum(len(r["live_turn_ends"]) for r in treatment)
    f_runs = sum(1 for r in treatment if r["short_ok"] and r["long_ok"])
    untracked = sum(len(r["untracked"]) for r in treatment)
    pc = sum(r["premature"] for r in control)
    pt = sum(r["premature"] for r in treatment)
    clean = sum(1 for r in treatment if r["premature"] == 0)
    p: bool | str = "unmeasured" if pc == 0 else (pt < pc and clean >= 9)
    sc = sum(1 for r in control if r["success"])
    st = sum(1 for r in treatment if r["success"])
    out: dict[str, Any] = {
        "foreground_share": round(share, 3), "W1": share >= 0.9,
        "live_turn_ends_treatment": live, "W2": live <= 1,
        "f_runs_treatment": f_runs, "F": f_runs >= 9,
        "untracked_treatment": untracked, "U": untracked == 0,
        "premature_control": pc, "premature_treatment": pt, "clean_treatment_runs": clean, "P": p,
        "success_control": sc, "success_treatment": st, "R": st >= 7 and st >= sc - 1,
    }
    passed = out["W1"] and out["W2"] and out["F"] and out["U"] and out["R"] and p in (True, "unmeasured")
    out["decision"] = "PASS" if passed else "FAIL"
    return out


def evaluate(
    manifest: Path,
    logs: Path,
    adjudications: Path | None,
    results_root: Path,
    archive: Mapping[str, Path],
    repo: Path = EVALS,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Classify every launched run and decide, or say why no decision is possible."""
    pins = read_pins(manifest)
    declared = read_rows(manifest)
    adjudicated = analyze.read_adjudications(adjudications) if adjudications else {}
    launches = read_logs(logs)
    keys = [(launch.arm, launch.proc) for launch in launches]
    reasons: list[str] = []
    if len(declared) != len(set(declared)):
        reasons.append("duplicate manifest rows")
    undeclared = sorted(set(keys) - set(declared))
    missing = sorted(set(declared) - set(keys))
    if undeclared:
        reasons.append(f"logs without a manifest row: {undeclared}")
    if missing:
        reasons.append(f"manifest rows without a log: {missing}")
    run_ids = [run_id for launch in launches for run_id in launch.run_ids]
    repeated = sorted({run_id for run_id in run_ids if run_ids.count(run_id) > 1})
    if repeated:
        reasons.append(f"run ids recorded by more than one launch: {repeated}")
    rows: list[dict[str, Any]] = []
    counted: dict[str, list[dict[str, Any]]] = {arm: [] for arm in ARMS}
    voids = {arm: 0 for arm in ARMS}
    restart = any(launch.fields.get("preflight") == "cc" for launch in launches)
    for launch in launches:
        done = launch.last.startswith("DONE ")
        if not launch.run_ids:
            # A preflight refusal started no agent, so nothing is discarded:
            # uncapped, like a setup void, and replaced by a new r<n> row once
            # the cause is fixed. A preflight=cc refusal is the restart signal
            # handled above. Quorum prints a run id only when a run finishes,
            # so any other launch without one was interrupted or killed after
            # its agent may have run, and it counts toward the cap.
            preflight = launch.fields.get("preflight")
            status = "restart" if preflight == "cc" else "preflight-refused" if preflight else "no-run"
            if status == "no-run":
                voids[launch.arm] += 1
            no_run = {"arm": launch.arm, "proc": launch.proc, **analyze.empty_measure(f"({launch.proc}: no run)")}
            no_run["status"] = status
            rows.append(no_run)
            continue
        for run_id in launch.run_ids:
            record = _record(launch.arm, run_id, results_root, archive)
            if (record / "verdict.json").is_file():
                m = analyze.measure(record, adjudicated)
            else:
                m = {**analyze.empty_measure(run_id), "void": "no-verdict"}
            row: dict[str, Any] = {"arm": launch.arm, "proc": launch.proc, **m}
            if not done:
                # A quorum exit outside 0-2 is a harness failure: capped like the other voids.
                voids[launch.arm] += 1
                row["status"] = "launch-failed"
            elif m["void"] == "void-setup":
                row["status"] = "void-setup"
            elif m["void"] is not None:
                voids[launch.arm] += 1
                row["status"] = m["void"]
            else:
                problems = _problems(m, launch.arm, launch, pins, repo)
                row["problems"] = problems
                if "cc" in problems:
                    row["status"] = "restart"
                    restart = True
                elif problems:
                    voids[launch.arm] += 1
                    row["status"] = "void-provenance"
                elif len(counted[launch.arm]) < N:
                    row["status"] = "counted"
                    counted[launch.arm].append(row)
                else:
                    row["status"] = "extra"
            rows.append(row)
    if restart:
        return rows, {"decision": "RESTART", "reasons": ["a run or a launch preflight saw a Claude Code version other than the pin"]}
    for arm in ARMS:
        if voids[arm] > VOID_CAP:
            reasons.append(f"{arm}: {voids[arm]} capped voids exceed the cap of {VOID_CAP}")
        if len(counted[arm]) < N:
            reasons.append(f"{arm}: {len(counted[arm])} of {N} valid runs")
    if reasons:
        return rows, {"decision": "INCOMPLETE", "reasons": reasons}
    pending = [r["run_id"] for arm in ARMS for r in counted[arm] if r["unadjudicated"]]
    if pending:
        return rows, {"decision": "UNADJUDICATED", "reasons": [f"candidates without a label in {', '.join(pending)}"]}
    return rows, decide(counted["control"], counted["treatment"])


def main() -> int:
    """Print every run's row and the decision; exit 0 on PASS or FAIL, 1 otherwise."""
    rows, decision = evaluate(HERE / "manifest.tsv", HERE / "logs", HERE / "adjudications.tsv", EVALS / "results", ARCHIVE)
    for r in rows:
        print(
            f"{r['arm']:9} {r['proc']:4} {r['run_id']} {r['status']:15} final={r['final']} "
            f"fg={r['dispatch_fg']} bg={r['dispatch_bg']} unclassified={r['dispatch_unclassified']} "
            f"live={len(r['live_turn_ends'])} short={r['short_ok']} long={r['long_ok']} "
            f"untracked={len(r['untracked'])} premature={r['premature']} unadjudicated={r['unadjudicated']} "
            f"censored={r['censored_stops']} success={r['success']} problems={','.join(r.get('problems') or []) or '-'}"
        )
    print()
    for key, value in decision.items():
        print(f"{key}: {value}")
    return 0 if decision["decision"] in ("PASS", "FAIL") else 1


if __name__ == "__main__":
    sys.exit(main())
