#!/usr/bin/env python3
"""Count framing cues in each manifest-row session's text up to its first classification.

A diagnostic, not part of the pre-registered rule. For every run a manifest
row's log names (``logs/<arm>-<scenario>-p<n>.log``), the Coding-Agent's
messages in ``trajectory.json`` are read in order up to and including the
first one that says "bounded" or "architectural"; each cue counts once per
session when its pattern appears anywhere in that text. Runs resolve as in
``tally.py``: the archive first, else the live results tree.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
EVALS = HERE.parents[1]
ARMS = ("control", "treatment")
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
CLASSIFICATION = re.compile(r"\b(bounded|architectural)\b", re.IGNORECASE)
CUES = {
    "outcome": re.compile(r"\boutcome", re.IGNORECASE),
    "new structure": re.compile(r"new module|subsystem|doesn['’]t have", re.IGNORECASE),
    "interface or signature": re.compile(r"interface|signature", re.IGNORECASE),
    "rung or ladder": re.compile(r"\brung|\bladder", re.IGNORECASE),
}


def run_dir(arm: str, run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param arm: ``control`` or ``treatment``.
    :param run_id: The quorum run id.
    :returns: The directory holding the run's ``trajectory.json``.
    """
    archived = HERE / "runs" / arm / run_id
    return archived if archived.is_dir() else EVALS / "results" / run_id


def text_to_classification(trajectory: Path) -> str:
    """Join the agent's messages up to and including its first classification.

    :param trajectory: A run's ATIF ``trajectory.json``.
    :returns: The joined text; every agent message when none classifies.
    """
    steps = json.loads(trajectory.read_text(encoding="utf-8"))["steps"]
    messages: list[str] = []
    for step in steps:
        message = step.get("message")
        if step.get("source") != "agent" or not isinstance(message, str):
            continue
        messages.append(message)
        if CLASSIFICATION.search(message):
            break
    return "\n".join(messages)


def main() -> int:
    """Print per-arm cue counts over the manifest-row sessions.

    :returns: Process exit status; 1 when a named run has no trajectory.
    """
    missing = 0
    for arm in ARMS:
        counts = dict.fromkeys(CUES, 0)
        sessions = 0
        for log in sorted((HERE / "logs").glob(f"{arm}-*-p[0-9].log")):
            for run_id in RUN_ID.findall(log.read_text(encoding="utf-8")):
                trajectory = run_dir(arm, run_id) / "trajectory.json"
                if not trajectory.is_file():
                    print(f"{arm}\t{run_id}\tNO TRAJECTORY")
                    missing += 1
                    continue
                text = text_to_classification(trajectory)
                sessions += 1
                for name, pattern in CUES.items():
                    if pattern.search(text):
                        counts[name] += 1
        print(
            f"{arm} ({sessions} sessions): "
            + ", ".join(f"{name} {n}/{sessions}" for name, n in counts.items())
        )
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
