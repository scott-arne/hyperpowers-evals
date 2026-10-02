#!/usr/bin/env python3
"""Tally the companion-placement-trigger campaign against its pre-registered rules.

Run ids come from the per-row logs (``logs/treatment-<scenario>-<proc>.log``,
``p<n>`` for manifest and extension rows and ``r<n>`` for replacements); each
run resolves to ``runs/treatment/<run-id>/`` when archived, else
``results/<run-id>/`` in the evals clone. A run id at the start of a line in
``superseded.txt`` (an indeterminate whose one re-run is counted instead) is
printed but not counted.

A session counts as started when its post-phase ``tool-arg-match`` record (the
``start-server[.]sh`` assertion) passed. The measure is deterministic, so a
real indeterminate still reads started or not started from its transcript
check. The count is read against stage 1's count on the same scenario, for
whether the treatment starts the companion more often than the shipping head.
The composed final count is read against the same table as a guard: a fix
that starts the companion but breaks a graded criterion (opened upfront,
escalated the ceremony) does not hold.

The window readouts come from the session's main transcripts (subagent
transcripts excluded). The window opens at the first ``brainstorming`` Skill
call and closes at the decision point: the earliest of the first
``start-server.sh`` call, the first ``AskUserQuestion`` call, and the first
human-typed message after the skill call. A compaction in the window is the
manipulation check; the other readouts carry no reading.

Adapted from ``../2026-10-02-companion-default-window/tally.py``: the arm,
the scenario, the decision table, the guard, and the manipulation check
differ.
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
SCENARIO = "brainstorming-bounded-companion-after-compaction"
ARM = "treatment"
# Stage 1's counts on this scenario at the shipping head, as committed in
# ../2026-10-02-companion-after-compaction/tally.txt (evals 734790a): started
# 5 of 10 and a composed final of 5 of 10. They are the fixed control: this
# campaign does not re-run that arm.
STAGE1_STARTED, STAGE1_FINAL, STAGE1_N = 5, 5, 10
EXPECTED_CC = "2.1.287"
EXPECTED_MODEL = "claude-opus-5-5"
BRAINSTORMING = {"hyperpowers:brainstorming", "superpowers:brainstorming"}
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
LOG_NAME = re.compile(r"^treatment-(.+)-([pr]\d+)$")
NAMES_COMPANION = re.compile(r"visual[ -]companion|start-server", re.IGNORECASE)


def run_dir(arm: str, run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param arm: ``treatment``, the campaign's only arm.
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
    """Collect versions, models, and the window readouts from a run's transcripts.

    :param path: The run directory.
    :returns: ``versions`` and ``models`` (sets), ``compactions`` (auto
        compactions in the session), ``in_window`` (an auto compaction inside
        the window), ``summary_names`` (whether the last compact summary
        before the decision point names the visual companion), ``read_guide``
        (``visual-companion.md`` was read), and ``ask_first`` (an
        ``AskUserQuestion`` came before the first ``start-server.sh``). Each
        readout is None when its window or event is absent.
    """
    versions: set[str] = set()
    models: set[str] = set()
    events: list[tuple[str, str, str]] = []
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
            stamp = str(entry.get("timestamp") or "")
            if (
                entry.get("type") == "system"
                and entry.get("subtype") == "compact_boundary"
                and (entry.get("compactMetadata") or {}).get("trigger") == "auto"
            ):
                events.append((stamp, "compact", ""))
                continue
            message = entry.get("message") or {}
            if not isinstance(message, dict):
                continue
            if entry.get("type") == "user":
                if entry.get("isCompactSummary"):
                    events.append((stamp, "summary", message_text(message.get("content"))))
                elif (entry.get("origin") or {}).get("kind") == "human":
                    events.append((stamp, "human", ""))
                continue
            if isinstance(message.get("model"), str) and message["model"].startswith(
                "claude-"
            ):
                models.add(message["model"])
            content = message.get("content")
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                name = block.get("name")
                tool_input = block.get("input") or {}
                command = str(tool_input.get("command") or "") if name == "Bash" else ""
                if name == "AskUserQuestion":
                    events.append((stamp, "ask", ""))
                elif name == "Skill" and tool_input.get("skill") in BRAINSTORMING:
                    events.append((stamp, "skill", ""))
                # Sessions read the guide with Read or with cat through Bash;
                # stage 1's pilots did the latter.
                if "visual-companion.md" in command or (
                    name == "Read"
                    and str(tool_input.get("file_path") or "").endswith("visual-companion.md")
                ):
                    events.append((stamp, "guide", ""))
                if "start-server.sh" in command:
                    events.append((stamp, "start", ""))
    events.sort(key=lambda e: e[0])
    kinds = [kind for _, kind, _ in events]
    facts: dict[str, Any] = {
        "versions": versions,
        "models": models,
        "compactions": kinds.count("compact"),
        "in_window": None,
        "summary_names": None,
        "read_guide": "guide" in kinds,
        "ask_first": None,
    }
    if "start" in kinds:
        facts["ask_first"] = "ask" in kinds[: kinds.index("start")]
    skill_at = next((s for s, k, _ in events if k == "skill"), None)
    if skill_at is None:
        return facts
    decision_at = next(
        (s for s, k, _ in events if s > skill_at and k in ("start", "ask", "human")),
        None,
    )
    if decision_at is None:
        return facts
    window = [(k, text) for s, k, text in events if skill_at < s < decision_at]
    facts["in_window"] = any(k == "compact" for k, _ in window)
    summaries = [text for s, k, text in events if k == "summary" and s < decision_at]
    if summaries:
        facts["summary_names"] = bool(NAMES_COMPANION.search(summaries[-1]))
    return facts


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


def read_run(arm: str, proc: str, run_id: str, superseded: set[str]) -> dict[str, Any] | None:
    """Read one run's verdict and transcript facts, and print its row.

    :param arm: ``treatment``, the campaign's only arm.
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
    started = post_check(verdict, "tool-arg-match")
    kind = void_kind(verdict)
    if kind is None and facts["versions"] and facts["versions"] != {EXPECTED_CC}:
        kind = "void-version"
    if kind is None:
        kind = "started" if started else "not-started" if started is False else "no-record"
    if run_id in superseded:
        kind = f"superseded-{kind}"
    run = {
        "run_id": run_id,
        "proc": proc,
        "kind": kind,
        "final": final_reading(verdict),
        "skill": post_check(verdict, "skill-called"),
        "cc": ",".join(sorted(facts["versions"])) or "-",
        "models": ",".join(sorted(facts["models"])) or "-",
        **{k: facts[k] for k in ("compactions", "in_window", "summary_names", "read_guide", "ask_first")},
    }
    print(
        f"{proc}\t{run_id}\t{kind}\tfinal={run['final']}\tskill-called={run['skill']}"
        f"\tcc={run['cc']}\tmodels={run['models']}\tcompactions={run['compactions']}"
        f"\tin-window={run['in_window']}\tsummary-names-companion={run['summary_names']}"
        f"\tread-guide={run['read_guide']}\task-before-start={run['ask_first']}"
    )
    return run


def collect(logs: Path) -> tuple[list[dict[str, Any]], int]:
    """Gather every run the logs name.

    :param logs: The log directory.
    :returns: The counted arm's runs, and the number of its named runs
        without a verdict.
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
    print(f"{ARM}:")
    runs: list[dict[str, Any]] = []
    missing = 0
    for log in sorted(logs.glob(f"{ARM}-*-[pr][0-9]*.log")):
        match = LOG_NAME.match(log.stem)
        if not match or match.group(1) != SCENARIO:
            continue
        for run_id in RUN_ID.findall(log.read_text(encoding="utf-8")):
            run = read_run(ARM, match.group(2), run_id, superseded)
            if run is None:
                missing += 1
            else:
                runs.append(run)
    return runs, missing


def counted(runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop void attempts and superseded indeterminates.

    :param runs: The campaign's runs.
    :returns: The runs that occupy a trial slot.
    """
    return [r for r in runs if not str(r["kind"]).startswith(("void-", "superseded-"))]


def band(count: int, n: int) -> str:
    """Place one count in the README's decision table.

    :param count: Sessions that met the measure.
    :param n: Sessions counted, 10 or 20.
    :returns: ``separates``, ``extend``, ``call`` or ``no``.
    """
    if n == 10:
        return "no" if count <= 6 else "extend" if count <= 9 else "separates"
    return "no" if count <= 15 else "call" if count <= 17 else "separates"


def reading(started: int, final: int, n: int) -> str:
    """Apply the README's decision table, the started count first.

    :param started: Sessions that started the companion.
    :param final: Sessions whose composed final passed.
    :param n: Sessions counted.
    :returns: The pre-registered reading.
    """
    if n not in (10, 20):
        return f"none yet: the table reads 10 or 20 counted sessions, not {n}"
    primary = band(started, n)
    if primary == "no":
        return "does not separate from stage 1: the fix fails"
    if primary == "extend":
        return "extend once to n=20"
    if primary == "call":
        return "not separated: the human partner's call"
    if band(final, n) == "separates":
        return "separates from stage 1: the fix holds"
    return "the started count separates and the composed final does not: the human partner's call"


def report(runs: list[dict[str, Any]]) -> None:
    """Print the pre-registered reading and readouts.

    :param runs: The campaign's runs.
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
    no_record = sum(r["kind"] == "no-record" for r in kept)
    finals = sum(r["final"] == "pass" for r in kept)
    skills = sum(r["skill"] is True for r in kept)
    missed = [r["run_id"] for r in kept if r["in_window"] is not True]
    print(
        f"{SCENARIO}: started {started}/{n} (no check record {no_record});"
        f" final {finals}/{n}; brainstorming skill-called {skills}/{n}"
    )
    print(
        f"  stage 1 started ({STAGE1_STARTED}/{STAGE1_N}) below this count:"
        f" one-sided Fisher p {fisher_lower(started, STAGE1_STARTED, n, STAGE1_N):.4f}"
    )
    print(
        f"  stage 1 final ({STAGE1_FINAL}/{STAGE1_N}) below this count:"
        f" one-sided Fisher p {fisher_lower(finals, STAGE1_FINAL, n, STAGE1_N):.4f}"
    )
    print(
        f"  manipulation check: compaction missed the window {len(missed)}/{n}"
        f" ({', '.join(missed) or 'none'})"
    )
    # Every stage 1 session compacted before the decision point. When more
    # than a fifth of these miss it, the treatment no longer shares the
    # condition its control was measured under, so no reading is taken.
    if len(missed) * 5 > n:
        print("  reading: none: the manipulation check failed; the human partner decides")
    else:
        print(f"  reading: {reading(started, finals, n)}")
    print("  readouts, no reading attached:")
    for label, group in (
        ("started", [r for r in kept if r["kind"] == "started"]),
        ("not started", [r for r in kept if r["kind"] != "started"]),
    ):
        in_window = [r for r in group if r["in_window"] is True]
        print(
            f"    {label} ({len(group)}): compaction in the window {len(in_window)};"
            f" no window {sum(r['in_window'] is None for r in group)};"
            f" last summary before the decision names the companion"
            f" {sum(r['summary_names'] is True for r in group)}"
            f" of {sum(r['summary_names'] is not None for r in group)} with a summary;"
            f" read visual-companion.md {sum(r['read_guide'] for r in group)}"
        )
    ask_first = sum(r["ask_first"] is True for r in kept)
    print(
        "    started sessions with AskUserQuestion before the first start:"
        f" {ask_first}/{started}"
    )
    failed_finals = [r["run_id"] for r in kept if r["kind"] == "started" and r["final"] != "pass"]
    print(
        "    started sessions whose composed final did not pass:"
        f" {', '.join(failed_finals) or 'none'}"
    )


def main() -> int:
    """Tally the campaign.

    :returns: Process exit status; 1 when a named run has no verdict.
    """
    runs, missing = collect(HERE / "logs")
    report(runs)
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
