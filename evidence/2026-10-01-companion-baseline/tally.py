#!/usr/bin/env python3
"""Tally the visual-companion baseline against its pre-registered rules.

Run ids come from the per-row logs (``logs/control-<scenario>-<proc>.log``,
``p<n>`` for manifest and extension rows and ``r<n>`` for replacements); each
run resolves to ``runs/control/<run-id>/`` when archived, else
``results/<run-id>/`` in the evals clone. A run id at the start of a line in
``superseded.txt`` (an indeterminate whose one re-run is counted instead) is
printed but not counted.

A session counts as started when its post-phase ``tool-arg-match`` record (the
``start-server[.]sh`` assertion) passed. The measure is deterministic, so a
real indeterminate still reads started or not started from its transcript
check. The cell is read against the best a fix could do, n of n.
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
SCENARIO = "brainstorming-bounded-fires-visual-companion"
EXPECTED_CC = "2.1.284"
EXPECTED_MODEL = "claude-opus-5-5"
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
LOG_NAME = re.compile(r"^control-(.+)-([pr]\d+)$")


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


def post_check(verdict: dict[str, Any], name: str) -> bool | None:
    """Read one post-phase check record.

    :param verdict: A parsed ``verdict.json``.
    :param name: The check verb, e.g. ``tool-arg-match``.
    :returns: Whether it passed, or None when the record is absent.
    """
    for record in verdict.get("checks") or []:
        if record.get("phase") == "post" and record.get("check") == name:
            return bool(record.get("passed"))
    return None


def final_reading(verdict: dict[str, Any]) -> str:
    """Read a run by its composed final verdict.

    :param verdict: A parsed ``verdict.json``.
    :returns: ``pass``, ``fail`` or ``indeterminate``.
    """
    final = verdict.get("final")
    return str(final) if final in ("pass", "fail") else "indeterminate"


def transcript_facts(path: Path) -> tuple[set[str], set[str], bool | None]:
    """Collect versions, models, and question-before-companion order.

    :param path: The run directory.
    :returns: The Claude Code versions and models the session transcripts
        record, and whether an ``AskUserQuestion`` call came before the first
        ``start-server.sh`` call (None when the companion never started).
    """
    versions: set[str] = set()
    models: set[str] = set()
    events: list[tuple[str, str]] = []
    for transcript in path.glob("home/.claude/projects/*/*.jsonl"):
        for line in transcript.read_text(encoding="utf-8").splitlines():
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(entry, dict):
                continue
            if isinstance(entry.get("version"), str):
                versions.add(entry["version"])
            message = entry.get("message") or {}
            if not isinstance(message, dict):
                continue
            if isinstance(message.get("model"), str) and message["model"].startswith(
                "claude-"
            ):
                models.add(message["model"])
            content = message.get("content")
            if not isinstance(content, list):
                continue
            stamp = str(entry.get("timestamp") or "")
            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                name = block.get("name")
                command = str((block.get("input") or {}).get("command") or "")
                if name == "AskUserQuestion":
                    events.append((stamp, "ask"))
                elif name == "Bash" and "start-server.sh" in command:
                    events.append((stamp, "start"))
    events.sort()
    kinds = [kind for _, kind in events]
    if "start" not in kinds:
        return versions, models, None
    return versions, models, "ask" in kinds[: kinds.index("start")]


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


def collect(logs: Path) -> tuple[list[dict[str, Any]], int]:
    """Gather every run the logs name.

    :param logs: The log directory.
    :returns: The runs, and the number of named runs without a verdict.
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
    runs: list[dict[str, Any]] = []
    missing = 0
    for log in sorted(logs.glob("control-*-[pr][0-9]*.log")):
        match = LOG_NAME.match(log.stem)
        if not match or match.group(1) != SCENARIO:
            continue
        proc = match.group(2)
        for run_id in RUN_ID.findall(log.read_text(encoding="utf-8")):
            path = run_dir(run_id)
            verdict_path = path / "verdict.json"
            if not verdict_path.is_file():
                print(f"{proc}\t{run_id}\tNO VERDICT")
                missing += 1
                continue
            verdict = json.loads(verdict_path.read_text(encoding="utf-8"))
            started = post_check(verdict, "tool-arg-match")
            kind = void_kind(verdict) or (
                "started" if started else "not-started" if started is False else "no-record"
            )
            if run_id in superseded:
                kind = f"superseded-{kind}"
            versions, models, ask_first = transcript_facts(path)
            run = {
                "run_id": run_id,
                "proc": proc,
                "kind": kind,
                "final": final_reading(verdict),
                "skill": post_check(verdict, "skill-called"),
                "cc": ",".join(sorted(versions)) or "-",
                "models": ",".join(sorted(models)) or "-",
                "ask_first": ask_first,
            }
            runs.append(run)
            print(
                f"{proc}\t{run_id}\t{kind}\tfinal={run['final']}"
                f"\tskill-called={run['skill']}\tcc={run['cc']}\tmodels={run['models']}"
                f"\task-before-start={ask_first}"
            )
    return runs, missing


def counted(runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop void attempts and superseded indeterminates.

    :param runs: The campaign's runs.
    :returns: The runs that occupy a trial slot.
    """
    return [r for r in runs if not str(r["kind"]).startswith(("void-", "superseded-"))]


def reading(started: int, n: int) -> str:
    """Apply the README's decision table.

    :param started: Sessions that started the companion.
    :param n: Sessions counted.
    :returns: The pre-registered reading.
    """
    if n not in (10, 20):
        return f"none yet: the table reads 10 or 20 counted sessions, not {n}"
    if n == 10:
        if started <= 6:
            return "reproduces the failure"
        if started == 7:
            return "extend once to n=20"
        return "does not reproduce"
    if started <= 15:
        return "reproduces the failure"
    if started <= 17:
        return "not separated: the human partner's call"
    return "does not reproduce"


def report(runs: list[dict[str, Any]]) -> None:
    """Print the pre-registered reading and readouts.

    :param runs: The campaign's runs.
    """
    print()
    kept = counted(runs)
    off_version = [r["run_id"] for r in kept if r["cc"] != EXPECTED_CC]
    off_model = [r["run_id"] for r in kept if r["models"] != EXPECTED_MODEL]
    print(
        f"Claude Code: counted sessions not on {EXPECTED_CC} alone:"
        f" {', '.join(off_version) or 'none'}"
    )
    print(
        f"Model: counted sessions not on {EXPECTED_MODEL} alone:"
        f" {', '.join(off_model) or 'none'}"
    )
    n = len(kept)
    if not n:
        print("no counted sessions")
        return
    started = sum(r["kind"] == "started" for r in kept)
    no_record = sum(r["kind"] == "no-record" for r in kept)
    finals = sum(r["final"] == "pass" for r in kept)
    skills = sum(r["skill"] is True for r in kept)
    ask_first = sum(r["ask_first"] is True for r in kept)
    p = fisher_lower(n, started, n, n)
    print(
        f"{SCENARIO}: started {started}/{n} (no check record {no_record});"
        f" final {finals}/{n}; brainstorming skill-called {skills}/{n}"
    )
    print(f"  a perfect fix ({n}/{n}) against this count: one-sided Fisher p {p:.4f}")
    print(
        "  readout: started sessions with AskUserQuestion before the first start:"
        f" {ask_first}/{started}"
    )
    print(f"  reading: {reading(started, n)}")


def main() -> int:
    """Tally the campaign.

    :returns: Process exit status; 1 when a named run has no verdict.
    """
    runs, missing = collect(HERE / "logs")
    report(runs)
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
