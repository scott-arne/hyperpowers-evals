#!/usr/bin/env python3
"""Tally the companion-over-trigger campaign against its pre-registered rules.

Run ids come from the per-row logs (``logs/<arm>-<scenario>-<proc>.log``,
``p<n>`` for manifest, pilot and extension rows and ``r<n>`` for
replacements); each run resolves to ``runs/<arm>/<run-id>/`` when archived,
else ``results/<run-id>/`` in the evals clone. A run id at the start of a line
in ``superseded.txt`` (an indeterminate whose one re-run is counted instead) is
printed but not counted. The ``control`` arm is the uncounted pilot: its rows
are printed with the instrument check and carry no reading.

A session counts as started when its post-phase negated record for the
``start-server[.]sh`` assertion failed (``not check-transcript tool-arg-match``
records the inner verb as ``check-transcript`` with ``negated`` true, so a
failed negation means ``start-server.sh`` ran). A counted session with no
usable record is read from its main transcript instead and named. Starting
the companion here is the over-trigger, so the table reads the treatment's
count on its own: the change puts nothing on a page, and no count of starts
is the expected one.

The readouts come from the session's main transcripts (subagent transcripts
excluded) and carry no reading.

Adapted from ``../2026-10-02-companion-placement-trigger/tally.py``: the
scenario, the measure's record, the decision table, the validity rule, the
pilot, and the readouts differ.
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
SCENARIO = "brainstorming-bounded-companion-closed-cli-output"
COUNTED_ARM = "treatment"
PILOT_ARM = "control"
EXPECTED_CC = "2.1.287"
EXPECTED_MODEL = "claude-opus-5-5"
BRAINSTORMING = {"hyperpowers:brainstorming", "superpowers:brainstorming"}
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
LOG_NAME = re.compile(r"^(control|treatment)-(.+)-([pr]\d+)$")
LOCAL_URL = re.compile(r"(?:localhost|127\.0\.0\.1):\d+")
HTML_REDIRECT = re.compile(r">\s*\S+\.html\b")


def run_dir(arm: str, run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param arm: ``control`` (the pilot) or ``treatment``.
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


def post_check(verdict: dict[str, Any], name: str) -> bool | None:
    """Read one non-negated post-phase check record.

    :param verdict: A parsed ``verdict.json``.
    :param name: The check verb, e.g. ``skill-called``.
    :returns: Whether it passed, or None when the record is absent.
    """
    for record in verdict.get("checks") or []:
        if (
            record.get("phase") == "post"
            and record.get("check") == name
            and not record.get("negated")
        ):
            return bool(record.get("passed"))
    return None


def start_record(verdict: dict[str, Any]) -> bool | None:
    """Read the negated ``start-server[.]sh`` record as started or not.

    A negation the check tool refused to invert is recorded under ``not`` with
    ``negated`` false; it carries no measurement, so it reads as absent.

    :param verdict: A parsed ``verdict.json``.
    :returns: True when ``start-server.sh`` ran, False when it did not, None
        when no usable record exists.
    """
    for record in verdict.get("checks") or []:
        args = record.get("args") or []
        if (
            record.get("phase") == "post"
            and record.get("check") == "check-transcript"
            and record.get("negated")
            and args[:1] == ["tool-arg-match"]
        ):
            return not record.get("passed")
    return None


def final_reading(verdict: dict[str, Any]) -> str:
    """Read a run by its composed final verdict.

    :param verdict: A parsed ``verdict.json``.
    :returns: ``pass``, ``fail`` or ``indeterminate``.
    """
    final = verdict.get("final")
    return str(final) if final in ("pass", "fail") else "indeterminate"


def message_text(content: Any) -> str:
    """Flatten a message's content to its text.

    :param content: A string or a list of content blocks.
    :returns: The concatenated text blocks.
    """
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    return " ".join(
        str(b.get("text") or "")
        for b in content
        if isinstance(b, dict) and b.get("type") == "text"
    )


def transcript_facts(path: Path) -> dict[str, Any]:
    """Collect versions, models, and the readouts from a run's main transcripts.

    :param path: The run directory.
    :returns: ``versions`` and ``models`` (sets), ``compactions`` (auto
        compactions), ``read_guide`` (``visual-companion.md`` was read),
        ``asks`` (``AskUserQuestion`` calls), ``html_writes`` (Write or Edit
        calls on an ``.html`` path, plus Bash redirects into one),
        ``local_url`` (assistant text names a ``localhost`` or ``127.0.0.1``
        port), and ``start_seen`` (a Bash command ran ``start-server.sh``).
    """
    versions: set[str] = set()
    models: set[str] = set()
    facts: dict[str, Any] = {
        "compactions": 0,
        "read_guide": False,
        "asks": 0,
        "html_writes": 0,
        "local_url": False,
        "start_seen": False,
    }
    for transcript in path.glob("home/.claude/projects/*/*.jsonl"):
        for line in transcript.read_text(encoding="utf-8").splitlines():
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(entry, dict) or entry.get("isSidechain"):
                continue
            if isinstance(entry.get("version"), str):
                versions.add(entry["version"])
            if (
                entry.get("type") == "system"
                and entry.get("subtype") == "compact_boundary"
                and (entry.get("compactMetadata") or {}).get("trigger") == "auto"
            ):
                facts["compactions"] += 1
                continue
            message = entry.get("message") or {}
            if not isinstance(message, dict) or entry.get("type") != "assistant":
                continue
            if isinstance(message.get("model"), str) and message["model"].startswith(
                "claude-"
            ):
                models.add(message["model"])
            content = message.get("content")
            if LOCAL_URL.search(message_text(content)):
                facts["local_url"] = True
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                name = block.get("name")
                tool_input = block.get("input") or {}
                command = str(tool_input.get("command") or "") if name == "Bash" else ""
                file_path = str(tool_input.get("file_path") or "")
                if name == "AskUserQuestion":
                    facts["asks"] += 1
                if name in ("Write", "Edit") and file_path.endswith(".html"):
                    facts["html_writes"] += 1
                if HTML_REDIRECT.search(command):
                    facts["html_writes"] += 1
                # Sessions read the guide with Read or with cat through Bash.
                if "visual-companion.md" in command or (
                    name == "Read" and file_path.endswith("visual-companion.md")
                ):
                    facts["read_guide"] = True
                if "start-server.sh" in command:
                    facts["start_seen"] = True
    facts["versions"] = versions
    facts["models"] = models
    return facts


def upper_bound(count: int, n: int) -> float:
    """One-sided 95% Clopper-Pearson upper bound on a binomial rate.

    :param count: Sessions that met the measure.
    :param n: Sessions counted.
    :returns: The rate at which ``count`` or fewer of ``n`` has probability 0.05.
    """
    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        tail = sum(comb(n, k) * mid**k * (1 - mid) ** (n - k) for k in range(count + 1))
        lo, hi = (mid, hi) if tail > 0.05 else (lo, mid)
    return hi


def read_run(
    arm: str, proc: str, run_id: str, superseded: set[str]
) -> dict[str, Any] | None:
    """Read one run's verdict and transcript facts, and print its row.

    :param arm: ``control`` (the pilot) or ``treatment``.
    :param proc: The row's proc id.
    :param run_id: The quorum run id.
    :param superseded: Run ids replaced by their re-run.
    :returns: The run, or None when it has no verdict.
    """
    path = run_dir(arm, run_id)
    verdict_path = path / "verdict.json"
    if not verdict_path.is_file():
        print(f"{proc}\t{run_id}\tNO VERDICT")
        return None
    verdict = json.loads(verdict_path.read_text(encoding="utf-8"))
    facts = transcript_facts(path)
    record = start_record(verdict)
    started = facts["start_seen"] if record is None else record
    kind = void_kind(verdict)
    if kind is None and facts["versions"] and facts["versions"] != {EXPECTED_CC}:
        kind = "void-version"
    if kind is None:
        kind = "started" if started else "not-started"
    if run_id in superseded:
        kind = f"superseded-{kind}"
    pre = [r for r in verdict.get("checks") or [] if r.get("phase") == "pre"]
    gauntlet = verdict.get("gauntlet") or {}
    run = {
        "run_id": run_id,
        "proc": proc,
        "kind": kind,
        "record": record,
        "final": final_reading(verdict),
        "skill": post_check(verdict, "skill-called"),
        "pre_ok": bool(pre) and all(r.get("passed") for r in pre),
        "graded": bool(gauntlet) and void_kind(verdict) != "void-grader",
        "cc": ",".join(sorted(facts["versions"])) or "-",
        "models": ",".join(sorted(facts["models"])) or "-",
        **{
            k: facts[k]
            for k in (
                "compactions",
                "read_guide",
                "asks",
                "html_writes",
                "local_url",
                "start_seen",
            )
        },
    }
    source = "transcript" if record is None else "record"
    print(
        f"{proc}\t{run_id}\t{kind}\tfrom={source}\tfinal={run['final']}"
        f"\tskill-called={run['skill']}\tcc={run['cc']}\tmodels={run['models']}"
        f"\tcompactions={run['compactions']}\tread-guide={run['read_guide']}"
        f"\tasks={run['asks']}\thtml-writes={run['html_writes']}"
        f"\tlocal-url={run['local_url']}\ttranscript-start={run['start_seen']}"
    )
    return run


def collect(logs: Path) -> tuple[dict[str, list[dict[str, Any]]], int]:
    """Gather every run the logs name, per arm.

    :param logs: The log directory.
    :returns: The runs keyed by arm, and the number of named runs without a
        verdict.
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
    runs: dict[str, list[dict[str, Any]]] = {PILOT_ARM: [], COUNTED_ARM: []}
    missing = 0
    for arm, label in (
        (PILOT_ARM, "control (pilot, uncounted)"),
        (COUNTED_ARM, COUNTED_ARM),
    ):
        print(f"{label}:")
        for log in sorted(logs.glob(f"{arm}-*-[pr][0-9]*.log")):
            match = LOG_NAME.match(log.stem)
            if not match or match.group(2) != SCENARIO:
                continue
            for run_id in RUN_ID.findall(log.read_text(encoding="utf-8")):
                run = read_run(arm, match.group(3), run_id, superseded)
                if run is None:
                    missing += 1
                else:
                    runs[arm].append(run)
    return runs, missing


def counted(runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop void attempts and superseded indeterminates.

    :param runs: An arm's runs.
    :returns: The runs that occupy a trial slot.
    """
    return [r for r in runs if not str(r["kind"]).startswith(("void-", "superseded-"))]


def reading(started: int, n: int) -> str:
    """Apply the README's decision table to the treatment's started count.

    :param started: Sessions that started the companion.
    :param n: Sessions counted.
    :returns: The pre-registered reading.
    """
    if n == 10:
        if started == 0:
            return "holds: the companion stayed closed"
        if started == 1:
            return "extend once to n=20"
        return "fails: the treatment opens the companion on a change with no page"
    if n == 20:
        if started <= 1:
            return "holds: the companion stayed closed"
        return "fails: the treatment opens the companion on a change with no page"
    return f"none yet: the table reads 10 or 20 counted sessions, not {n}"


def report_pilot(runs: list[dict[str, Any]]) -> None:
    """Print the pilot's instrument check, which carries no reading.

    :param runs: The control arm's runs.
    """
    print()
    if not runs:
        print("pilot: not run")
        return
    for r in runs:
        print(
            f"pilot {r['run_id']}: pre-checks passed {r['pre_ok']};"
            f" start record present {r['record'] is not None};"
            f" skill-called record present {r['skill'] is not None};"
            f" grader wrote a result {r['graded']};"
            f" started {r['kind'] == 'started'} (reported, no reading);"
            f" final {r['final']}; compactions {r['compactions']}"
        )


def report(runs: list[dict[str, Any]]) -> None:
    """Print the pre-registered reading and readouts for the counted arm.

    :param runs: The treatment's runs.
    """
    print()
    kept = counted(runs)
    off_model = [r["run_id"] for r in kept if r["models"] != EXPECTED_MODEL]
    print(
        f"Claude Code: sessions voided for a version other than {EXPECTED_CC} alone:"
        f" {', '.join(r['run_id'] for r in runs if r['kind'] == 'void-version') or 'none'}"
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
    from_transcript = [r["run_id"] for r in kept if r["record"] is None]
    finals = sum(r["final"] == "pass" for r in kept)
    no_skill = [r["run_id"] for r in kept if r["skill"] is not True]
    print(
        f"{SCENARIO}: started {started}/{n}; final {finals}/{n};"
        f" brainstorming skill-called {n - len(no_skill)}/{n}"
    )
    print(
        "  read from the transcript for want of a usable record:"
        f" {', '.join(from_transcript) or 'none'}"
    )
    print(
        f"  validity: no brainstorming Skill call {len(no_skill)}/{n}"
        f" ({', '.join(no_skill) or 'none'})"
    )
    # A session that never loads brainstorming cannot open its companion, so
    # it reads as closed without testing the change. When more than a fifth
    # of sessions skip the skill, the count no longer measures the treatment.
    if len(no_skill) * 5 > n:
        print("  reading: none: the validity check failed; the human partner decides")
    else:
        print(f"  reading: {reading(started, n)}")
    print("  readouts, no reading attached:")
    print(
        f"    one-sided 95% upper bound on the start rate: {upper_bound(started, n):.3f}"
    )
    disagree = [
        r["run_id"]
        for r in kept
        if r["record"] is not None and r["record"] != r["start_seen"]
    ]
    print(
        "    record and main-transcript start disagree:"
        f" {', '.join(disagree) or 'none'}"
    )
    compacted = [r["run_id"] for r in kept if r["compactions"]]
    print(f"    sessions with an auto compaction: {', '.join(compacted) or 'none'}")
    print(f"    read visual-companion.md: {sum(r['read_guide'] for r in kept)}/{n}")
    print(
        f"    AskUserQuestion: {sum(r['asks'] > 0 for r in kept)}/{n} sessions,"
        f" {sum(r['asks'] for r in kept)} calls"
    )
    print(
        f"    sessions writing an .html file: {sum(r['html_writes'] > 0 for r in kept)}/{n}"
    )
    print(f"    sessions naming a local URL: {sum(r['local_url'] for r in kept)}/{n}")
    failed_finals = [r["run_id"] for r in kept if r["final"] != "pass"]
    print(
        f"    sessions whose composed final did not pass: {', '.join(failed_finals) or 'none'}"
    )


def main() -> int:
    """Tally the campaign.

    :returns: Process exit status; 1 when a named run has no verdict.
    """
    runs, missing = collect(HERE / "logs")
    report_pilot(runs[PILOT_ARM])
    report(runs[COUNTED_ARM])
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
