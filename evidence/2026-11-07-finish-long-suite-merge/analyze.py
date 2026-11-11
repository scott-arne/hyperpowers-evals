"""Per-run measures for the finish-long-suite-merge scenario (README "Measure").

The whole-run measures (L, S, M, the arm) come from the finish-long-suite
campaign's analyzer, unchanged except for the two plugin roots that name the
arms. This file adds the merge phase: everything after the session's first
``git merge`` of the feature branch.

Usage: python3 analyze.py <results-root> <run-id>... > measures.jsonl
       python3 analyze.py --tally measures.jsonl
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import sys
from collections.abc import Mapping, Sequence
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

FIRST = Path(__file__).resolve().parent.parent / "2026-11-07-finish-long-suite"
_spec = importlib.util.spec_from_file_location(
    "finish_long_suite_analyze", FIRST / "analyze.py"
)
assert _spec is not None and _spec.loader is not None
fls = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(fls)
lv = fls.lv
tl = fls.tl

fls.CONTROL_ROOT = ".worktrees/finish-merge-control/skills/"  # pyright: ignore[reportAttributeAccessIssue]
fls.TREATMENT_ROOT = ".worktrees/finish-long-suite/skills/"  # pyright: ignore[reportAttributeAccessIssue]

MERGE = re.compile(r"\bgit\b[^|;&\n]*\smerge\s+(?!-base)[^|;&\n]*strip-accents")
BRANCH_DELETE = re.compile(r"\bgit\b[^|;&\n]*\sbranch\s+-[dD]\b[^|;&\n]*strip-accents")
EXITED_OK = "exited code=0"
# The suite takes about 11.7 minutes, so a green reading sooner than this
# after the launch it belongs to cannot be that launch's result.
REAL_RUN = timedelta(seconds=600)


def bash_calls(records: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Every Bash call in file order, with its result text and result time."""
    calls: dict[str, dict[str, Any]] = {}
    order: list[dict[str, Any]] = []
    for rec in records:
        for use in lv.tool_uses(rec):
            if use.get("name") != "Bash":
                continue
            inp = lv.tool_input(use)
            call = {
                "at": lv.parse_ts(rec["timestamp"]),
                "command": str(inp.get("command") or ""),
                "background": inp.get("run_in_background") is True,
                "result": "",
                "result_at": None,
            }
            calls[str(use.get("id"))] = call
            order.append(call)
        if rec.get("type") == "user":
            for block in lv.blocks(rec):
                if block.get("type") != "tool_result":
                    continue
                call = calls.get(str(block.get("tool_use_id")))
                if call is not None:
                    call["result"] = lv.result_text(block)
                    call["result_at"] = lv.parse_ts(rec["timestamp"])
    return order


def completions(calls: Sequence[Mapping[str, Any]]) -> list[datetime]:
    """Every time a full suite run is shown finished, in file order.

    A finished run is the suite's own output (the corpus replay done, or
    unittest's "Ran N tests" with the full count), or a wait-exit green read at
    least REAL_RUN after the latest suite launch before it. A green read sooner
    than that is an earlier run's exit file.
    """
    launches = [c["at"] for c in calls if tl.runs_soak(c["command"], fls.SUITE)]
    out = []
    for c in calls:
        at = c["result_at"]
        if at is None:
            continue
        text = c["result"]
        if fls.REPLAY_DONE.search(text) or any(
            int(n) >= fls.FULL_COUNT for n in fls.FULL_RUN.findall(text)
        ):
            out.append(at)
        elif "wait-exit" in c["command"] and EXITED_OK in text:
            before = [t for t in launches if t <= c["at"]]
            if before and at - max(before) >= REAL_RUN:
                out.append(at)
    return out


def unfinished_at(
    at: datetime, calls: Sequence[Mapping[str, Any]], done: Sequence[datetime]
) -> bool:
    """True when the latest suite launch before ``at`` has not been shown finished.

    A task stays live in the turn-liveness library until Claude Code's
    completion notice arrives, which can come seconds after the session read
    the finished log and moved on; such a turn end is not one at which the
    suite was still running.
    """
    launches = [
        c["at"]
        for c in calls
        if c["at"] <= at and tl.runs_soak(c["command"], fls.SUITE)
    ]
    if not launches:
        return False
    latest = max(launches)
    return not any(latest < d <= at for d in done)


def merge_phase(record: Path, out: dict[str, Any]) -> None:
    transcript = tl.main_transcript(tl.workspace_of(record))
    if transcript is None:
        out.update(merged=None)
        return
    records = lv.load(transcript)
    calls = bash_calls(records)
    merges = [c for c in calls if MERGE.search(c["command"])]
    if not merges:
        out.update(merged=False, L2=False, S2=False, F=False, P=False)
        return
    merge_at = merges[0]["at"]
    task_map = lv.tasks(records)
    reload_times = lv.reloads(records)
    ends = [e for e in lv.turn_ends(records) if e.excluded is None and e.at > merge_at]
    finished = completions(calls)
    live2 = [
        e
        for e in ends
        if lv.state_at(e.at, task_map, reload_times) == "live"
        and unfinished_at(e.at, calls, finished)
    ]
    launches2 = [
        c for c in calls if c["at"] > merge_at and tl.runs_soak(c["command"], fls.SUITE)
    ]
    untracked2 = [
        e
        for e in ends
        if any(
            tl.shell_detaches(c["command"])
            and not c["background"]
            and c["at"] <= e.at <= c["at"] + fls.UNTRACKED_WINDOW
            for c in launches2
        )
        and unfinished_at(e.at, calls, finished)
    ]
    done = next((d for d in finished if d > merge_at), None)
    deletes = [
        c for c in calls if c["at"] > merge_at and BRANCH_DELETE.search(c["command"])
    ]
    deleted_at = deletes[0]["at"] if deletes else None
    early_green = [
        c["result_at"].isoformat()
        for c in calls
        if c["result_at"] is not None
        and c["at"] > merge_at
        and "wait-exit" in c["command"]
        and EXITED_OK in c["result"]
        and (done is None or c["result_at"] < done)
    ]
    f = deleted_at is not None and (done is None or deleted_at < done)
    l2 = bool(live2 or untracked2)
    out.update(
        merged=True,
        merge_at=merge_at.isoformat(),
        merge_command=merges[0]["command"][:300],
        merged_launches=[
            {
                "at": c["at"].isoformat(),
                "background": c["background"],
                "command": c["command"][-300:],
            }
            for c in launches2
        ],
        merged_completed_at=done.isoformat() if done else None,
        branch_deleted_at=deleted_at.isoformat() if deleted_at else None,
        early_green_reads=early_green,
        live_turn_ends_merged=[
            {"at": e.at.isoformat(), "text": e.text[-300:], "ended_by": e.ended_by}
            for e in live2
        ],
        untracked_turn_ends_merged=[
            {"at": e.at.isoformat(), "text": e.text[-300:]} for e in untracked2
        ],
        L2=l2,
        S2=done is not None,
        F=f,
        P=l2 or f,
    )


def measure(record: Path) -> dict[str, Any]:
    if not (record / "verdict.json").exists():
        # A void run left out of the archive (README "Outcome").
        return {"run": record.name, "void": "not archived", "arm": None}
    out = fls.measure(record)
    merge_phase(record, out)
    return out


def tally(path: Path) -> str:
    rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    lines = []
    for arm in ("control", "treatment"):
        mine = [r for r in rows if r.get("arm") == arm]
        counted = [r for r in mine if not r.get("void")]
        parts = [f"{arm}: runs {len(mine)}, void {len(mine) - len(counted)}"]
        for key in ("P", "L2", "F", "S2", "M", "L", "S", "merged"):
            parts.append(
                f"{key} {sum(1 for r in counted if r.get(key))}/{len(counted)}"
            )
        lines.append(", ".join(parts))
    return "\n".join(lines)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=(__doc__ or "").splitlines()[0])
    parser.add_argument("--tally", type=Path)
    parser.add_argument("root", nargs="?", type=Path)
    parser.add_argument("runs", nargs="*")
    args = parser.parse_args(argv)
    if args.tally:
        print(tally(args.tally))
        return 0
    if args.root is None or not args.runs:
        parser.error("give a results root and at least one run id")
    for run in args.runs:
        print(json.dumps(measure(args.root / run)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
