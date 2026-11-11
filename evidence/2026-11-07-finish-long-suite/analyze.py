"""Per-run measures for the finish-long-suite scenario (README "Measure").

Reads each run's main-session transcript through the turn-liveness library
(``evidence/2026-10-19-sdd-turn-liveness/liveness.py``) and that campaign's
command classifiers (``runs_soak``, ``shell_detaches``), unchanged, so a live
turn end means the same thing here as there.

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
from datetime import timedelta
from pathlib import Path
from typing import Any

LIVENESS = Path(__file__).resolve().parent.parent / "2026-10-19-sdd-turn-liveness"
if str(LIVENESS) not in sys.path:
    sys.path.append(str(LIVENESS))

# That campaign's analyzer shares this file's module name, so it is loaded
# from its path under another name.
_spec = importlib.util.spec_from_file_location(
    "turn_liveness_analyze", LIVENESS / "analyze.py"
)
assert _spec is not None and _spec.loader is not None
tl = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(tl)
lv = sys.modules["liveness"]

SUITE = "test_corpus"
# The full suite is the six fast tests plus the corpus replay.
FULL_RUN = re.compile(r"\bRan (\d+) tests?\b")
FULL_COUNT = 7
REPLAY_DONE = re.compile(r"test_replay\b[^\n]*\.\.\.\s*(?:ok|FAIL|ERROR)|corpus 35/35")
# The arm is read from the plugin root the skill loaded from.
TREATMENT_ROOT = ".worktrees/finish-long-suite/skills/"
CONTROL_ROOT = ".worktrees/plugin-install/skills/"
# An untracked launch is judged over the suite's runtime plus a margin.
UNTRACKED_WINDOW = timedelta(minutes=13)


def suite_completed(records: Sequence[Mapping[str, Any]]) -> bool:
    """S: some tool result shows the full suite, or the corpus replay, finished."""
    for rec in records:
        if rec.get("type") != "user":
            continue
        for block in lv.blocks(rec):
            if block.get("type") != "tool_result":
                continue
            text = lv.result_text(block)
            if REPLAY_DONE.search(text):
                return True
            if any(int(n) >= FULL_COUNT for n in FULL_RUN.findall(text)):
                return True
    return False


def measure(record: Path) -> dict[str, Any]:
    verdict = json.loads((record / "verdict.json").read_text())
    out: dict[str, Any] = {
        "run": record.name,
        "final": verdict.get("final"),
        "void": tl.void_kind(verdict),
    }
    post = [
        c
        for c in verdict.get("checks") or []
        if isinstance(c, dict) and c.get("phase") == "post"
    ]
    out["M"] = bool(post) and all(c.get("passed") for c in post)
    transcript = tl.main_transcript(tl.workspace_of(record))
    if transcript is None:
        out.update(L=None, S=None, note="no transcript")
        return out
    raw = transcript.read_text(errors="replace")
    out["arm"] = (
        "treatment"
        if TREATMENT_ROOT in raw
        else "control"
        if CONTROL_ROOT in raw
        else None
    )
    records = lv.load(transcript)
    task_map = lv.tasks(records)
    reload_times = lv.reloads(records)
    ends = [e for e in lv.turn_ends(records) if e.excluded is None]
    states = [(e, lv.state_at(e.at, task_map, reload_times)) for e in ends]
    launches = []
    for rec in records:
        for use in lv.tool_uses(rec):
            if use.get("name") != "Bash":
                continue
            inp = lv.tool_input(use)
            command = str(inp.get("command") or "")
            if not tl.runs_soak(command, SUITE):
                continue
            background = inp.get("run_in_background") is True
            launches.append(
                {
                    "at": lv.parse_ts(rec["timestamp"]),
                    "background": background,
                    "untracked": tl.shell_detaches(command) and not background,
                    "timeout": inp.get("timeout"),
                    "command": command[:300],
                }
            )
    untracked_ends = [
        e
        for e in ends
        if any(
            lz["untracked"] and lz["at"] <= e.at <= lz["at"] + UNTRACKED_WINDOW
            for lz in launches
        )
    ]
    live_ends = [e for e, s in states if s == "live"]
    out.update(
        L=bool(live_ends or untracked_ends),
        live_turn_ends=[
            {"at": e.at.isoformat(), "text": e.text[-300:], "ended_by": e.ended_by}
            for e in live_ends
        ],
        untracked_turn_ends=[
            {"at": e.at.isoformat(), "text": e.text[-300:]} for e in untracked_ends
        ],
        censored_turn_ends=sum(1 for _, s in states if s == "censored"),
        turn_ends=len(ends),
        suite_launches=[{**lz, "at": lz["at"].isoformat()} for lz in launches],
        wait_exit_calls=sum(
            1
            for rec in records
            for use in lv.tool_uses(rec)
            if use.get("name") == "Bash"
            and "wait-exit" in str(lv.tool_input(use).get("command") or "")
        ),
        S=suite_completed(records),
    )
    return out


def tally(path: Path) -> str:
    rows = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    lines = []
    for arm in ("control", "treatment"):
        mine = [r for r in rows if r.get("arm") == arm]
        counted = [r for r in mine if not r.get("void")]
        parts = [f"{arm}: runs {len(mine)}, void {len(mine) - len(counted)}"]
        for key in ("L", "S", "M"):
            parts.append(
                f"{key} {sum(1 for r in counted if r.get(key))}/{len(counted)}"
            )
        lines.append(", ".join(parts))
    return "\n".join(lines)


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
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
    raise SystemExit(main())
