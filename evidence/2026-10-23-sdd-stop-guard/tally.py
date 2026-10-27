"""Tally the sdd-stop-guard campaign against its pre-registered rule.

The rule is spec Design §4's criteria H1 to H4 and R, pre-registered in
``README.md`` before the first counted run. Inputs: ``manifest.tsv`` (the
campaign pin as two-field rows and every launch row, ``p<n>`` and replacement
``r<n>``), the launch logs in ``logs/`` (one per launch row, written by
``logs/measure-launch.sh``), ``adjudications.tsv`` (the human partner's label
for each hand-back allow and each block), and the runs, archived under
``task-20-runs/treatment/``. Only the archive is read: a run the campaign has
not filed yet is unfinished business, not evidence. ``analyze.measure``
supplies every per-run number; this module checks provenance, applies the void
rules and counts.

The campaign has one arm. The question is whether the stop guard's own
decisions hold, not whether they beat a control, so there is no control row
and no paired comparison.
"""

from __future__ import annotations

import argparse
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
INSTRUMENT_VOID = "void-instrument"
# A setup failure started no agent and a transport failure lost the grader, so
# neither observed behavior to completion; a run that never started may also
# be missing the fields `_problems` reads, which is why `evaluate` settles
# these two before it looks at provenance.
NO_BEHAVIOR_VOIDS = ("void-setup", "void-transport")
# The campaign's vocabulary for the kinds that never consume the three-void
# cap (evidence/2026-10-19-sdd-turn-liveness/README.md "Void rules", plus this
# campaign's instrument kind). `evaluate` routes the instrument kind by its own
# branch rather than by membership here, because it is weighed after
# provenance; see that branch.
UNCAPPED_VOIDS = (*NO_BEHAVIOR_VOIDS, INSTRUMENT_VOID)
ARM = "treatment"
ARMS = (ARM,)
SCENARIO = "sdd-turn-liveness"
DEFAULT_MANIFEST = Path("manifest.tsv")
DEFAULT_ARCHIVE = Path("task-20-runs") / ARM
DEFAULT_OUT = Path("tally.txt")
PIN_KEYS = (
    "harness", "treatment", "treatment_root", "model",
    "cc", "cc_path", "provider", "subagent_models", "codex", "task_tools",
)
HARNESS_PATHS = (
    "src", "coding-agents", "package.json", "bun.lock", "bunfig.toml", "tsconfig.json",
    "container", "scripts/evals-container", "scenarios", "fixtures",
)
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
TOKEN = re.compile(r"(\w+)=(\S+)")
LOG_NAME = re.compile(rf"^({ARM})-{SCENARIO}-([pr]\d+)\.log$")


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
        lines = text.rstrip("\n").splitlines()
        # Provenance comes only from lines the launcher writes: the header before
        # its "$ <command>" line and the footer just before the last line.
        # Quorum's output between them carries model-written text, so a
        # key=value there must not stand in for the launcher's own.
        end = next((i for i, line in enumerate(lines) if line.startswith("$ ")), len(lines))
        trusted = lines[:end]
        if end < len(lines) - 1 and lines[-2].startswith("root_after_head="):
            trusted.append(lines[-2])
        fields: dict[str, str] = {}
        for line in trusted:
            for key, value in TOKEN.findall(line):
                fields.setdefault(key, value)
        found.append(Launch(match.group(1), match.group(2), path, fields, RUN_ID.findall(text), lines[-1] if lines else ""))
    found.sort(key=lambda launch: _proc_key(launch.proc))
    return found


def harness_ok(commit: str | None, pin: str, repo: Path) -> bool:
    """Whether a run's evals commit is the harness pin, or descends from it with the harness paths unchanged.

    Evidence commits land between the launches (an archived run is committed
    before the next one starts), so a late run's recorded commit is later than
    the pin; ``measure-launch.sh`` makes the same comparison before every
    launch.
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


def _record(run_id: str, archive: Path) -> Path:
    """The run's archived record directory.

    The archive is the only place the tally reads. The plan archives a run and
    post-checks it, adjudicates it, and only then tallies (Tasks 20 and 21), so
    reading the clone's mutable ``results/`` as a fallback would let the
    decision of record rest on an unfiled, still-writable run.
    """
    return archive / run_id


def _cc_changed(recorded: str | None, launch: Launch, pins: Mapping[str, str]) -> bool:
    """Whether the run or its launch recorded a Claude Code version other than the pin.

    Checked before any other classification: a version change restarts the
    campaign whatever else happened to the run, a void included.
    """
    seen = (recorded, launch.fields.get("cc_before"), launch.fields.get("cc_after"))
    return any(v is not None and v != pins["cc"] for v in seen)


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
    # A differing version has already restarted the campaign (_cc_changed); a
    # version nobody recorded is a missing provenance field, which voids the run.
    if None in (m["cc"], f.get("cc_before"), f.get("cc_after")):
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


def decide(treatment: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """H1 to H4 and R (stop-guard spec, Design §4) over the counted runs."""
    with_plan = sum(1 for r in treatment if r["plan_decisions"] >= 1)
    neither = sum(r["neither_listed"] for r in treatment)
    false_handbacks = sum(r["false_handbacks"] for r in treatment)
    pending_allows = sum(r["unadjudicated_allows"] for r in treatment)
    false_blocks = sum(r["false_blocks"] for r in treatment)
    pending_blocks = sum(r["unadjudicated_blocks"] for r in treatment)
    fg = sum(r["dispatch_fg"] for r in treatment)
    other = sum(r["dispatch_bg"] + r["dispatch_unclassified"] for r in treatment)
    share = fg / (fg + other) if fg + other else 0.0
    untracked = sum(len(r["untracked"]) for r in treatment)
    f_runs = sum(1 for r in treatment if r["short_ok"] and r["long_ok"])
    live_shell = sum(len(r["live_shell_turn_ends"]) for r in treatment)
    successes = sum(1 for r in treatment if r["success"])
    out: dict[str, Any] = {
        "runs_with_plan_decisions": with_plan, "H1": with_plan == len(treatment),
        "neither_listed_total": neither, "false_handbacks_total": false_handbacks, "unadjudicated_allows_total": pending_allows,
        "H2": neither == 0 and false_handbacks == 0 and pending_allows == 0,
        "false_blocks_total": false_blocks, "unadjudicated_blocks_total": pending_blocks, "H3": false_blocks == 0 and pending_blocks == 0,
        "foreground_share": round(share, 3), "untracked_total": untracked, "f_runs": f_runs, "live_shell_turn_ends_total": live_shell,
        "H4": share >= 0.9 and untracked == 0 and f_runs >= 9 and live_shell == 0,
        "success_runs": successes, "R": successes >= 7,
    }
    out["decision"] = "PASS" if out["H1"] and out["H2"] and out["H3"] and out["H4"] and out["R"] else "FAIL"
    return out


def _instrument_void(m: Mapping[str, Any]) -> bool:
    """Whether the run's decision record cannot be read as what the hook decided.

    A Gauntlet-listed stop no decision answers, and two payloads under one
    decision key, each leave the run unmeasurable rather than measured wrong.
    The reader failure ``analyze.measure`` records as ``void-instrument`` is
    the third of these; it arrives as the run's void kind, so ``evaluate``
    reads it from there rather than from this test.

    Only a run whose verdict named no capped void and whose provenance is the
    pin's reaches either test. Both of those outcomes are capped and this one
    is not, so asking it first would turn a misconfigured or already-void run
    into a free attempt the campaign has not earned.
    """
    return bool(m["unmatched_stops"]) or m["decision_conflicts"] > 0


def evaluate(
    manifest: Path,
    logs: Path,
    adjudications: Path | None,
    archive: Path,
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
    counted: list[dict[str, Any]] = []
    unarchived: list[str] = []
    voids = 0
    restart = any(launch.fields.get("preflight") == "cc" for launch in launches)
    for launch in launches:
        done = launch.last.startswith("DONE ")
        if not launch.run_ids:
            # A preflight refusal started no agent, so nothing is discarded:
            # uncapped, like a setup void, and replaced by a new r<n> row once
            # the cause is fixed. A preflight=cc refusal, or a footer that saw
            # the version change, restarts the campaign. Quorum prints a run id
            # only when a run finishes, so any other launch without one was
            # interrupted or killed after its agent may have run, and it
            # counts toward the cap.
            preflight = launch.fields.get("preflight")
            if preflight == "cc" or _cc_changed(None, launch, pins):
                status = "restart"
                restart = True
            elif preflight:
                status = "preflight-refused"
            else:
                status = "no-run"
                voids += 1
            no_run = {"arm": launch.arm, "proc": launch.proc, **analyze.empty_measure(f"({launch.proc}: no run)")}
            no_run["status"] = status
            rows.append(no_run)
            continue
        for run_id in launch.run_ids:
            record = _record(run_id, archive)
            archived = (record / "verdict.json").is_file()
            m = analyze.measure(record, adjudicated) if archived else analyze.empty_measure(run_id)
            row: dict[str, Any] = {"arm": launch.arm, "proc": launch.proc, **m}
            if _cc_changed(m["cc"], launch, pins):
                row["status"] = "restart"
                restart = True
            elif not done:
                # A quorum exit outside 0-2 is a harness failure: capped like the other voids.
                voids += 1
                row["status"] = "launch-failed"
            elif not archived:
                # The run finished but nobody filed it. That is work the
                # campaign still owes, not an attempt to replace, so it is no
                # void: the decision waits until the run is archived.
                unarchived.append(run_id)
                row["status"] = "unarchived"
            elif m["void"] in NO_BEHAVIOR_VOIDS:
                # Uncapped: a setup failure started no agent, a transport
                # failure lost the grader (deviation 10).
                row["status"] = m["void"]
            elif m["void"] is not None and m["void"] != INSTRUMENT_VOID:
                # A capped verdict void: `void-grader`, `void-other`.
                voids += 1
                row["status"] = m["void"]
            else:
                problems = _problems(m, launch.arm, launch, pins, repo)
                row["problems"] = problems
                if problems:
                    # Provenance outranks both the decision record and the
                    # instrument kind: a run that did not run against the pin
                    # is a capped void whichever reader broke on it, so a
                    # failure to read its records buys it no free retry.
                    voids += 1
                    row["status"] = "void-provenance"
                elif m["void"] == INSTRUMENT_VOID or _instrument_void(m):
                    # Uncapped, and reached only with the pin's provenance: an
                    # artifact reader raised on the run's own records
                    # (`analyze.measure` names the kind), a listed stop went
                    # unanswered, or two payloads shared one decision key.
                    row["status"] = INSTRUMENT_VOID
                elif len(counted) < N:
                    row["status"] = "counted"
                    counted.append(row)
                else:
                    row["status"] = "extra"
            rows.append(row)
    if restart:
        return rows, {"decision": "RESTART", "reasons": ["a run or a launch preflight saw a Claude Code version other than the pin"]}
    if voids > VOID_CAP:
        reasons.append(f"{ARM}: {voids} capped voids exceed the cap of {VOID_CAP}")
    if unarchived:
        reasons.append(f"{ARM}: {len(unarchived)} run(s) not archived: {unarchived}")
    if len(counted) < N:
        reasons.append(f"{ARM}: {len(counted)} of {N} valid runs")
    if reasons:
        return rows, {"decision": "INCOMPLETE", "reasons": reasons}
    # H2 and H3 ask what the human partner made of each hand-back allow and
    # each block, so an unlabelled one leaves the criteria unanswered rather
    # than failed; the runs stay counted so the labeller can read their rows.
    pending = [r["run_id"] for r in counted if r["unadjudicated_allows"] or r["unadjudicated_blocks"]]
    if pending:
        return rows, {"decision": "UNADJUDICATED", "reasons": [f"decisions without a label in {', '.join(pending)}"]}
    return rows, decide(counted)


def _under_here(path: Path) -> Path:
    """A path the caller gave, resolved against this script's own directory when relative."""
    return path if path.is_absolute() else HERE / path


def _row(r: Mapping[str, Any]) -> str:
    """One run's line: its provenance, its decision record and its H4 measures."""
    return (
        f"{r['arm']:9} {r['proc']:4} {r['run_id']} {r['status']:15} final={r['final']} "
        f"plan_decisions={r['plan_decisions']} blocks={r['blocks']} allows={sum(r['allows'].values())} "
        f"neither={r['neither_listed']} unmatched={len(r['unmatched_stops'])} "
        f"false_blocks={r['false_blocks']} false_handbacks={r['false_handbacks']} "
        f"fg={r['dispatch_fg']} bg={r['dispatch_bg']} unclassified={r['dispatch_unclassified']} "
        f"live={len(r['live_shell_turn_ends'])} short={r['short_ok']} long={r['long_ok']} "
        f"untracked={len(r['untracked'])} censored={r['censored_stops']} success={r['success']} "
        f"problems={','.join(r.get('problems') or []) or '-'}"
    )


def main(argv: Sequence[str] | None = None) -> int:
    """Print every run's row and the decision, write both to ``--out``; exit 0 on PASS or FAIL, 1 otherwise."""
    parser = argparse.ArgumentParser(description="Tally the sdd-stop-guard campaign.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--archive", type=Path, default=DEFAULT_ARCHIVE)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args(argv)
    rows, decision = evaluate(
        _under_here(args.manifest),
        HERE / "logs",
        HERE / "adjudications.tsv",
        _under_here(args.archive),
    )
    lines = [_row(r) for r in rows] + [""] + [f"{key}: {value}" for key, value in decision.items()]
    text = "".join(line + "\n" for line in lines)
    print(text, end="")
    _under_here(args.out).write_text(text)
    return 0 if decision["decision"] in ("PASS", "FAIL") else 1


if __name__ == "__main__":
    sys.exit(main())
