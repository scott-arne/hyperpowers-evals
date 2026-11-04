#!/usr/bin/env python3
"""Tally the 6.16.2 re-read campaign: control (v6.16.1) against the 6.16.2 branch.

Usage::

    python3 tally.py                                   # every campaign log
    python3 tally.py --run RUN_ID --arm ARM --scenario NAME   # one run (smoke)

It exits 0, or 1 when ``sentinel-reruns.tsv`` (original, replacement; tab
separated) breaks a rule.

Reads ``logs/<arm>-<scenario>-<proc>.log`` (arm ``control`` or ``treatment``;
proc ``p1``-``p10`` or ``r1``-``r3``; ``p90``, the smoke, is skipped), the run
ids (``run-id: ...``) inside each, the run's ``verdict.json`` and its main
transcripts (``home/.claude/projects/*/*.jsonl``, subagent transcripts
excluded), found in the record directory or in a sibling ``workspaces/<id>/``.

Rules, from the spec's Testing section:

* A log whose last line is not ``DONE ...`` (a ``FAILED <code>`` line or no
  terminal line) never yields a valid trial: the run is void, kind ``launch``.
* A setup or grader void in the verdict is void; so is a run whose window
  reading is invalid (kind ``instrument``). Voids occupy no trial slot.
* SDD window: the first automatic compaction falls after review 1's
  completion event and before the final review is dispatched. Outcome passes
  when every task whose review had not completed before the compaction is
  reviewed after it, the final review completes before the finishing skill is
  invoked, no implementer finished before the compaction is dispatched again,
  and quorum's post checks all passed. Mechanism passes when the
  subagent-driven-development SKILL.md is read after the compaction and before
  the next dispatch.
* Brainstorming window: an automatic compaction after the brainstorming skill
  call and before the first AskUserQuestion or start-server.sh call. Mechanism
  passes when brainstorming/SKILL.md is read between the compaction and that
  call. Outcome is quorum's post checks all passing.
* A replacement (``sentinel-reruns.tsv``) may replace only a void, in the same
  arm and scenario, at most three per cell; the replacement counts.
* Pass bars at ten valid trials per cell: SDD treatment outcome >= 8 and >=
  control's rate, SDD treatment mechanism >= 8; brainstorming treatment
  outcome rate >= control's, mechanism >= 8. Fewer valid reads INCOMPLETE.

``void_kind``, ``post_check`` and the log parsing are adapted from
../2026-10-02-companion-after-compaction/tally.py.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
EVALS = HERE.parents[1]
SDD = "sdd-compaction-reread"
BRAIN = "brainstorming-bounded-companion-after-compaction"
RUN_ROOTS = ("task-10-runs", "task-8-runs", "task-7-runs")
NOTIF_ID = re.compile(r"<tool-use-id>([^<]+)</tool-use-id>")
NOTIF_STATUS = re.compile(r"<status>([^<]+)</status>")


def run_paths(arm: str, run_id: str) -> tuple[Path, list[Path]]:
    """Locate a run's record and main transcripts, archived or live, relocated or legacy.

    :param arm: ``control``, ``treatment`` or ``smoke``.
    :param run_id: The quorum run id.
    :returns: The directory holding ``verdict.json`` and the sorted transcript paths.
    :raises FileNotFoundError: When no root holds the run.
    """
    bases = [HERE / root / arm for root in RUN_ROOTS] + [EVALS / "results"]
    for base in bases:
        record = base / run_id
        if (record / "verdict.json").is_file():
            workspace = base / "workspaces" / run_id
            home_root = workspace if (workspace / "home").is_dir() else record
            return record, sorted(home_root.glob("home/.claude/projects/*/*.jsonl"))
    raise FileNotFoundError(f"no record for run {run_id} under {[str(b) for b in bases]}")


def classify(description: str, prompt: str) -> tuple[str, int | None]:
    """Classify an Agent dispatch as implement/review/rereview/fix/final/other with its task number."""
    for kind, pattern in (
        ("implement", r"\s*Implement Task (\d+)"),
        ("rereview", r"\s*Re-review Task (\d+)"),
        ("review", r"\s*Review Task (\d+)"),
        ("fix", r"\s*Fix findings for Task (\d+)"),
    ):
        match = re.match(pattern, description or "")
        if match:
            return kind, int(match.group(1))
    match = re.match(r"\s*You are implementing Task (\d+)", prompt or "")
    if match:
        return "implement", int(match.group(1))
    if (
        re.search(r"final", description or "", re.IGNORECASE)
        or description == "Review code changes"
        or (prompt or "").lstrip().startswith("You are a Senior Code Reviewer")
    ):
        return "final", None
    return "other", None


def events(transcripts: list[Path]) -> list[dict[str, Any]]:
    """Main-thread events in file order: compact, dispatch, done, read, skill, ask, server."""
    found: list[dict[str, Any]] = []
    for path in transcripts:
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(entry, dict) or entry.get("isSidechain"):
                continue
            if (
                entry.get("type") == "system"
                and entry.get("subtype") == "compact_boundary"
                and (entry.get("compactMetadata") or {}).get("trigger") == "auto"
            ):
                found.append({"kind": "compact"})
                continue
            message = entry.get("message") or {}
            content = message.get("content") if isinstance(message, dict) else None
            if entry.get("type") == "assistant" and isinstance(content, list):
                for block in content:
                    if not isinstance(block, dict) or block.get("type") != "tool_use":
                        continue
                    name, args = block.get("name"), block.get("input") or {}
                    if name in ("Agent", "Task"):
                        kind, task = classify(str(args.get("description") or ""), str(args.get("prompt") or ""))
                        found.append({"kind": "dispatch", "class": kind, "task": task, "id": block.get("id")})
                    elif name == "Read":
                        found.append({"kind": "read", "path": str(args.get("file_path") or "")})
                    elif name == "Skill":
                        found.append({"kind": "skill", "skill": str(args.get("skill") or "")})
                    elif name == "AskUserQuestion":
                        found.append({"kind": "ask"})
                    elif name == "Bash" and "start-server.sh" in str(args.get("command") or ""):
                        found.append({"kind": "server"})
            elif entry.get("type") == "attachment":
                # A notification that lands while the controller is mid-turn is
                # delivered as a queued_command attachment, not a user message.
                attachment = entry.get("attachment") or {}
                prompt = attachment.get("prompt") if attachment.get("type") == "queued_command" else None
                if isinstance(prompt, str) and "<task-notification>" in prompt:
                    ident, status = NOTIF_ID.search(prompt), NOTIF_STATUS.search(prompt)
                    if ident and (status is None or status.group(1) == "completed"):
                        found.append({"kind": "done", "id": ident.group(1)})
            elif entry.get("type") == "user":
                if isinstance(content, list):
                    for block in content:
                        if isinstance(block, dict) and block.get("type") == "tool_result":
                            if "Async agent launched" not in json.dumps(block.get("content")):
                                found.append({"kind": "done", "id": block.get("tool_use_id")})
                text = content if isinstance(content, str) else json.dumps(content)
                if "<task-notification>" in text:
                    ident, status = NOTIF_ID.search(text), NOTIF_STATUS.search(text)
                    if ident and (status is None or status.group(1) == "completed"):
                        found.append({"kind": "done", "id": ident.group(1)})
    return found


def sdd_reading(found: list[dict[str, Any]]) -> dict[str, Any]:
    """Validity, outcome and mechanism for one SDD trial (rules in the module docstring)."""
    compact = next((i for i, e in enumerate(found) if e["kind"] == "compact"), None)
    dispatches = {e["id"]: e for e in found if e["kind"] == "dispatch"}
    done_at: dict[str, int] = {}
    for i, e in enumerate(found):
        if e["kind"] == "done" and e["id"] in dispatches and e["id"] not in done_at:
            done_at[e["id"]] = i
    review1_done = min(
        (done_at[k] for k, d in dispatches.items() if d["class"] == "review" and d["task"] == 1 and k in done_at),
        default=None,
    )
    final_at = next((i for i, e in enumerate(found) if e["kind"] == "dispatch" and e["class"] == "final"), None)
    valid = (
        compact is not None
        and review1_done is not None
        and review1_done < compact
        and (final_at is None or compact < final_at)
    )
    reading: dict[str, Any] = {"valid": valid, "outcome": None, "mechanism": None}
    if not valid:
        return reading
    done_before = {
        d["task"] for k, d in dispatches.items()
        if d["class"] in ("review", "rereview") and k in done_at and done_at[k] < compact
    }
    after = found[compact + 1:]
    reviewed_after = {e["task"] for e in after if e["kind"] == "dispatch" and e["class"] in ("review", "rereview")}
    final_pos = next((j for j, e in enumerate(after) if e["kind"] == "dispatch" and e["class"] == "final"), None)
    finish_pos = next(
        (
            j for j, e in enumerate(after)
            if final_pos is not None and j > final_pos
            and e["kind"] == "skill" and e["skill"].endswith("finishing-a-development-branch")
        ),
        None,
    )
    # The final review has to come back before Finish: a dispatched review
    # that never returned did not run in the sense the spec requires.
    final_id = after[final_pos]["id"] if final_pos is not None else None
    finished = (
        finish_pos is not None
        and final_id in done_at
        and done_at[final_id] < compact + 1 + finish_pos
    )
    redispatch = any(
        e["kind"] == "dispatch" and e["class"] == "implement" and e["task"] in done_before for e in after
    )
    reading["outcome"] = ({1, 2, 3, 4} - done_before) <= reviewed_after and finished and not redispatch
    first_dispatch = next((j for j, e in enumerate(after) if e["kind"] == "dispatch"), len(after))
    reading["mechanism"] = any(
        e["kind"] == "read" and e["path"].endswith("subagent-driven-development/SKILL.md")
        for e in after[:first_dispatch]
    )
    return reading


def brainstorming_reading(found: list[dict[str, Any]]) -> dict[str, Any]:
    """Window validity and mechanism for one brainstorming trial."""
    load = next(
        (i for i, e in enumerate(found) if e["kind"] == "skill" and e["skill"].endswith("brainstorming")), None
    )
    question = next((i for i, e in enumerate(found) if e["kind"] in ("ask", "server")), None)
    compact = next(
        (i for i, e in enumerate(found) if e["kind"] == "compact" and load is not None and i > load), None
    )
    valid = load is not None and compact is not None and (question is None or compact < question)
    reading: dict[str, Any] = {"valid": valid, "mechanism": None}
    if valid:
        stop = question if question is not None else len(found)
        reading["mechanism"] = any(
            e["kind"] == "read" and e["path"].endswith("brainstorming/SKILL.md") for e in found[compact + 1:stop]
        )
    return reading


def load_reruns(path: Path, runs: dict[str, dict[str, Any]]) -> dict[str, str]:
    """Read ``sentinel-reruns.tsv`` (original, replacement) and enforce the replacement rules.

    A replacement that is itself void may be replaced in turn by a later row
    naming it as the original (``original -> r1``, ``r1 -> r2``); every link
    counts toward the cell's cap of three.

    :raises ValueError: On an unknown run, an original replaced twice, a
        non-void original, a cross-cell replacement, a replacement used twice,
        more than three per arm and scenario, or an ``r<n>`` run no row lists.
    """
    pairs: dict[str, str] = {}
    used: set[str] = set()
    per_cell: Counter[tuple[str, str]] = Counter()
    if path.is_file():
        with path.open(encoding="utf-8") as handle:
            for row in csv.reader(handle, delimiter="\t"):
                if not row or row[0].startswith("#"):
                    continue
                original, replacement = row[0], row[1]
                if original not in runs or replacement not in runs:
                    raise ValueError(f"unknown run in sentinel-reruns.tsv: {original} {replacement}")
                o, r = runs[original], runs[replacement]
                if original in pairs:
                    raise ValueError(f"{original} is replaced more than once")
                if not o["void"]:
                    raise ValueError(f"{original} is not a void")
                if (o["arm"], o["scenario"]) != (r["arm"], r["scenario"]):
                    raise ValueError(f"{replacement} is not in {original}'s arm and scenario")
                if replacement in used:
                    raise ValueError(f"{replacement} replaces more than one run")
                used.add(replacement)
                per_cell[(o["arm"], o["scenario"])] += 1
                if per_cell[(o["arm"], o["scenario"])] > 3:
                    raise ValueError(f"more than three replacements in {o['arm']} {o['scenario']}")
                pairs[original] = replacement
    for run_id, run in runs.items():
        if run["proc"].startswith("r") and run_id not in used:
            raise ValueError(f"replacement run {run_id} has no sentinel-reruns.tsv row")
    return pairs

RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
SCENARIOS = (SDD, BRAIN)
LOG_NAME = re.compile(r"^(control|treatment)-(" + "|".join(SCENARIOS) + r")-([pr]\d+)$")
EXPECTED_VALID = 10


def void_kind(verdict: dict[str, Any]) -> str | None:
    """Name a setup or grader void read from the verdict (adapted from the companion tally).

    :param verdict: A parsed ``verdict.json``.
    :returns: ``setup``, ``grader``, or None for a real attempt.
    """
    if verdict.get("final") in ("pass", "fail"):
        return None
    reason = str(verdict.get("final_reason") or "")
    gauntlet = verdict.get("gauntlet") or {}
    if not gauntlet and "quorum error (setup)" in reason:
        return "setup"
    if gauntlet.get("status") == "investigate" and "without writing a result" in str(
        gauntlet.get("summary") or ""
    ):
        return "grader"
    return None


def post_check(verdict: dict[str, Any], name: str) -> bool | None:
    """Read one post-phase check record, or None when it is absent."""
    for record in verdict.get("checks") or []:
        if record.get("phase") == "post" and record.get("check") == name:
            return bool(record.get("passed"))
    return None


def post_checks_pass(verdict: dict[str, Any]) -> bool:
    """Whether every post-phase check passed; no post record at all is not a pass."""
    records = [r for r in verdict.get("checks") or [] if r.get("phase") == "post"]
    return bool(records) and all(r.get("passed") for r in records)


def final_reading(verdict: dict[str, Any]) -> str:
    """Read a run by its composed final verdict: ``pass``, ``fail`` or ``indeterminate``."""
    final = verdict.get("final")
    return str(final) if final in ("pass", "fail") else "indeterminate"


def placeholder(arm: str, scenario: str, proc: str, kind: str) -> dict[str, Any]:
    """A void row for a log or run that left no usable record."""
    return {
        "run": f"{kind}:{arm}-{scenario}-{proc}", "arm": arm, "scenario": scenario, "proc": proc,
        "void": True, "void_kind": kind, "valid": False, "outcome": None, "mechanism": None,
    }


def read_run(arm: str, scenario: str, proc: str, run_id: str, launch_ok: bool = True) -> dict[str, Any]:
    """Read one run and print its line.

    :param arm: ``control``, ``treatment`` or ``smoke``.
    :param scenario: One of the two campaign scenarios.
    :param proc: The row's proc id.
    :param run_id: The quorum run id.
    :param launch_ok: False when the launcher log did not end ``DONE``.
    :returns: The run's row; void with kind ``no-record`` when it has no verdict.
    """
    try:
        record, transcripts = run_paths(arm, run_id)
    except FileNotFoundError:
        run = placeholder(arm, scenario, proc, "no-record")
        run["run"] = run_id
        print_run(run)
        return run
    verdict = json.loads((record / "verdict.json").read_text(encoding="utf-8"))
    found = events(transcripts)
    if scenario == SDD:
        timing = sdd_reading(found)
    else:
        timing = brainstorming_reading(found)
    kind = "launch" if not launch_ok else void_kind(verdict)
    if kind is None and not timing["valid"]:
        kind = "instrument"
    valid = kind is None
    outcome: bool | None = None
    mechanism: bool | None = None
    if valid:
        passed = post_checks_pass(verdict)
        outcome = bool(timing["outcome"]) and passed if scenario == SDD else passed
        mechanism = bool(timing["mechanism"])
    run = {
        "run": run_id, "arm": arm, "scenario": scenario, "proc": proc, "void": kind is not None,
        "void_kind": kind, "valid": valid, "outcome": outcome, "mechanism": mechanism,
        "final": final_reading(verdict),
    }
    print_run(run)
    return run


def print_run(run: dict[str, Any]) -> None:
    print(
        f"{run['arm']}\t{run['scenario']}\t{run['proc']}\t{run['run']}"
        f"\tvoid={run['void_kind'] or '-'}\toutcome={run['outcome']}\tmechanism={run['mechanism']}"
    )


def collect(logs: Path) -> dict[str, dict[str, Any]]:
    """Read every campaign log's runs, keyed by run id.

    A log that does not end ``DONE`` yields only void ``launch`` runs; a log
    naming no run id yields a placeholder keyed by the log's name.

    :param logs: The log directory.
    :returns: The runs keyed by run id.
    """
    runs: dict[str, dict[str, Any]] = {}
    for log in sorted(logs.glob("*.log")):
        match = LOG_NAME.match(log.stem)
        if not match or match.group(3) == "p90":
            continue
        arm, scenario, proc = match.groups()
        text = log.read_text(encoding="utf-8")
        lines = [line for line in text.splitlines() if line.strip()]
        done = bool(lines) and lines[-1].startswith("DONE ")
        ids = RUN_ID.findall(text)
        if not ids:
            run = placeholder(arm, scenario, proc, "launch")
            run["run"] = f"launch:{log.stem}"
            print_run(run)
            runs[run["run"]] = run
        for run_id in ids:
            runs[run_id] = read_run(arm, scenario, proc, run_id, launch_ok=done)
    return runs


def rate(passes: int, valid: int) -> float:
    return passes / valid if valid else 0.0


def bar(ok: bool | None) -> str:
    return "INCOMPLETE" if ok is None else "PASS" if ok else "FAIL"


def summarize(runs: dict[str, dict[str, Any]], replaced: set[str]) -> None:
    """Print each cell's counts and the spec's pass-bar reading."""
    cells: dict[tuple[str, str], dict[str, int]] = {}
    for scenario in SCENARIOS:
        for arm in ("control", "treatment"):
            mine = [r for r in runs.values() if (r["arm"], r["scenario"]) == (arm, scenario)]
            valid = [r for r in mine if r["valid"] and r["run"] not in replaced]
            voids = Counter(r["void_kind"] for r in mine if r["void"])
            cell = {
                "runs": len(mine), "valid": len(valid),
                "outcome": sum(1 for r in valid if r["outcome"]),
                "mechanism": sum(1 for r in valid if r["mechanism"]),
            }
            cells[(arm, scenario)] = cell
            print(
                f"{arm} {scenario}: runs={cell['runs']} valid={cell['valid']} "
                f"voids={dict(voids) or '-'} outcome={cell['outcome']} mechanism={cell['mechanism']}"
            )

    def complete(*keys: tuple[str, str]) -> bool:
        return all(cells[k]["valid"] >= EXPECTED_VALID for k in keys)

    def rates(scenario: str) -> tuple[float, float]:
        c, t = cells[("control", scenario)], cells[("treatment", scenario)]
        return rate(c["outcome"], c["valid"]), rate(t["outcome"], t["valid"])

    sdd_t = cells[("treatment", SDD)]
    c_rate, t_rate = rates(SDD)
    print("SDD outcome (treatment >= 8 and >= control rate):",
          bar(None if not complete(("control", SDD), ("treatment", SDD))
              else sdd_t["outcome"] >= 8 and t_rate >= c_rate))
    print("SDD mechanism (treatment >= 8):",
          bar(None if not complete(("treatment", SDD)) else sdd_t["mechanism"] >= 8))
    c_rate, t_rate = rates(BRAIN)
    brain_t = cells[("treatment", BRAIN)]
    print("brainstorming outcome (treatment rate >= control rate):",
          bar(None if not complete(("control", BRAIN), ("treatment", BRAIN)) else t_rate >= c_rate))
    print("brainstorming mechanism (treatment >= 8):",
          bar(None if not complete(("treatment", BRAIN)) else brain_t["mechanism"] >= 8))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--run", help="read one run by id (smoke)")
    parser.add_argument("--arm", default="control", help="arm of --run: control, treatment or smoke")
    parser.add_argument("--scenario", choices=SCENARIOS, help="scenario of --run")
    args = parser.parse_args()
    if args.run:
        if not args.scenario:
            parser.error("--run needs --scenario")
        read_run(args.arm, args.scenario, "p90", args.run)
        return 0
    runs = collect(HERE / "logs")
    try:
        pairs = load_reruns(HERE / "sentinel-reruns.tsv", runs)
    except ValueError as error:
        print(f"sentinel-reruns.tsv: {error}")
        return 1
    summarize(runs, set(pairs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
