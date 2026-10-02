#!/usr/bin/env python3
"""Tally the plans-component-library baseline against its pre-registered rules.

Run ids come from the per-row logs (``logs/control-<scenario>-<proc>.log``,
``p<n>`` for manifest, pilot and extension rows and ``r<n>`` for
replacements); each run resolves to ``runs/control/<run-id>/`` when archived,
else ``results/<run-id>/`` in the evals clone. A run id at the start of a line
in ``superseded.txt`` (an indeterminate whose one re-run is counted instead) is
printed but not counted. The campaign has one arm. Proc ``p0`` and its
relaunch ``r0`` are the uncounted pilot: their rows are printed with the
instrument check and carry no reading. Every other proc is counted.

A session counts as using the library when both of its post-phase
``command-succeeds`` records for the plan's fenced code passed: the one that
greps for ``dataTable(`` and the one that greps for ``selectField(``. A counted
session missing either record is read from its plan files instead, with the
same fence rule, and named. A session that wrote no plan counts as not using
the library and is named.

The readouts come from the plan files in the archived fixture and from the
session's main transcripts (subagent transcripts excluded), and carry no
reading.

Adapted from ``../2026-10-02-companion-over-trigger/tally.py``: the scenario,
the measure's records, the decision table, the validity rule, the single arm,
and the readouts differ.
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
SCENARIO = "writing-plans-reuses-component-library"
ARM = "control"
PILOT_PROCS = {"p0", "r0"}
EXPECTED_CC = "2.1.287"
EXPECTED_MODEL = "claude-opus-5-5"
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
LOG_NAME = re.compile(r"^control-(.+)-([pr]\d+)$")
FENCE = re.compile(r"^\s*```")
GROUNDING = re.compile(r"^##\s+Grounding\b(.*?)(?=^##\s|\Z)", re.MULTILINE | re.DOTALL)
UI_PATH = re.compile(r"\bsrc/ui\b")
CALLS = ("dataTable(", "selectField(", "statusChip(", "emptyState(", "filterBar(")


def run_dir(run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param run_id: The quorum run id.
    :returns: The directory holding the run's ``verdict.json``.
    """
    archived = HERE / "runs" / ARM / run_id
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


def post_record(
    verdict: dict[str, Any], check: str, needle: str = "", negated: bool = False
) -> bool | None:
    """Read one post-phase check record.

    :param verdict: A parsed ``verdict.json``.
    :param check: The check verb, e.g. ``skill-called``.
    :param needle: A substring the record's first argument must contain.
    :param negated: Whether the record is a ``not`` negation.
    :returns: Whether it passed, or None when the record is absent.
    """
    for record in verdict.get("checks") or []:
        args = record.get("args") or [""]
        if (
            record.get("phase") == "post"
            and record.get("check") == check
            and bool(record.get("negated")) == negated
            and needle in str(args[0])
        ):
            return bool(record.get("passed"))
    return None


def final_reading(verdict: dict[str, Any]) -> str:
    """Read a run by its composed final verdict.

    :param verdict: A parsed ``verdict.json``.
    :returns: ``pass``, ``fail`` or ``indeterminate``.
    """
    final = verdict.get("final")
    return str(final) if final in ("pass", "fail") else "indeterminate"


def plan_facts(path: Path) -> dict[str, Any]:
    """Read the session's plan files the way the post-checks do.

    Fenced code is every line between a pair of fence lines, with the fence
    state reset at the start of each file, as the checks' ``awk`` does.

    :param path: The run directory.
    :returns: ``plans`` (file names), ``code`` (the calls in ``CALLS`` found in
        fenced code), ``raw_table`` and ``raw_select`` (fenced code writes its
        own ``<table`` or ``<select`` markup), ``names_ui`` (the plan names
        ``src/ui`` anywhere), ``names_services`` (the plan names
        ``services.js`` anywhere), and ``grounding`` (``none`` without a
        Grounding section, else which of ``src/ui`` and ``services.js`` it
        names).
    """
    workdir = path / "coding-agent-workdir"
    plans = sorted(workdir.glob("docs/*/plans/*.md"))
    code_lines: list[str] = []
    text = ""
    for plan in plans:
        body = plan.read_text(encoding="utf-8")
        text += body + "\n"
        fenced = False
        for line in body.splitlines():
            if FENCE.match(line):
                fenced = not fenced
                continue
            if fenced:
                code_lines.append(line)
    code = "\n".join(code_lines)
    sections = GROUNDING.findall(text)
    if not sections:
        grounding = "none"
    else:
        cited = [
            label
            for label, hit in (
                ("src/ui", any(UI_PATH.search(s) for s in sections)),
                ("services.js", any("services.js" in s for s in sections)),
            )
            if hit
        ]
        grounding = "+".join(cited) or "neither"
    return {
        "plans": [p.name for p in plans],
        "code": {call for call in CALLS if call in code},
        "raw_table": "<table" in code,
        "raw_select": "<select" in code,
        "names_ui": bool(UI_PATH.search(text)),
        "names_services": "services.js" in text,
        "grounding": grounding,
    }


def transcript_facts(path: Path) -> dict[str, Any]:
    """Collect versions, models, and the readouts from a run's main transcripts.

    :param path: The run directory.
    :returns: ``versions`` and ``models`` (sets), ``compactions`` (auto
        compactions), ``read_ui`` (a Read of a ``src/ui/`` file, or a Bash
        command naming ``src/ui``), ``read_services`` (the same for
        ``src/pages/services.js``), ``skills`` (Skill names called), ``asks``
        (``AskUserQuestion`` calls), and ``agents`` (``Agent`` or ``Task``
        dispatches).
    """
    versions: set[str] = set()
    models: set[str] = set()
    skills: set[str] = set()
    facts: dict[str, Any] = {
        "compactions": 0,
        "read_ui": False,
        "read_services": False,
        "asks": 0,
        "agents": 0,
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
            if not isinstance(content, list):
                continue
            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                name = block.get("name")
                tool_input = block.get("input") or {}
                command = str(tool_input.get("command") or "") if name == "Bash" else ""
                file_path = str(tool_input.get("file_path") or "")
                if name == "Skill":
                    skills.add(str(tool_input.get("skill") or ""))
                if name == "AskUserQuestion":
                    facts["asks"] += 1
                if name in ("Agent", "Task"):
                    facts["agents"] += 1
                if (name == "Read" and "/src/ui/" in file_path) or UI_PATH.search(
                    command
                ):
                    facts["read_ui"] = True
                if (
                    name == "Read" and file_path.endswith("src/pages/services.js")
                ) or "services.js" in command:
                    facts["read_services"] = True
    facts["versions"] = versions
    facts["models"] = models
    facts["skills"] = skills
    return facts


def read_run(proc: str, run_id: str, superseded: set[str]) -> dict[str, Any] | None:
    """Read one run's verdict, plan and transcript facts, and print its row.

    :param proc: The row's proc id.
    :param run_id: The quorum run id.
    :param superseded: Run ids replaced by their re-run.
    :returns: The run, or None when it has no verdict.
    """
    path = run_dir(run_id)
    verdict_path = path / "verdict.json"
    if not verdict_path.is_file():
        print(f"{proc}\t{run_id}\tNO VERDICT")
        return None
    verdict = json.loads(verdict_path.read_text(encoding="utf-8"))
    plan = plan_facts(path)
    facts = transcript_facts(path)
    table = post_record(verdict, "command-succeeds", "dataTable(")
    select = post_record(verdict, "command-succeeds", "selectField(")
    from_plan = table is None or select is None
    if from_plan:
        used = {"dataTable(", "selectField("} <= plan["code"]
    else:
        used = bool(table and select)
    kind = void_kind(verdict)
    if kind is None and facts["versions"] and facts["versions"] != {EXPECTED_CC}:
        kind = "void-version"
    if kind is None:
        kind = "used" if used else "not-used"
    if run_id in superseded:
        kind = f"superseded-{kind}"
    pre = [r for r in verdict.get("checks") or [] if r.get("phase") == "pre"]
    gauntlet = verdict.get("gauntlet") or {}
    run = {
        "run_id": run_id,
        "proc": proc,
        "kind": kind,
        "table": table,
        "select": select,
        "from_plan": from_plan,
        "plan_record": post_record(
            verdict, "command-succeeds", "plans/*.md >/dev/null"
        ),
        "untouched": post_record(
            verdict, "command-succeeds", "git status", negated=True
        ),
        "final": final_reading(verdict),
        "skill": post_record(verdict, "skill-called"),
        "pre_ok": bool(pre) and all(r.get("passed") for r in pre),
        "graded": bool(gauntlet) and void_kind(verdict) != "void-grader",
        "cc": ",".join(sorted(facts["versions"])) or "-",
        "models": ",".join(sorted(facts["models"])) or "-",
        **plan,
        **{
            k: facts[k]
            for k in (
                "compactions",
                "read_ui",
                "read_services",
                "skills",
                "asks",
                "agents",
            )
        },
    }
    source = "plan" if from_plan else "record"
    print(
        f"{proc}\t{run_id}\t{kind}\tfrom={source}\tfinal={run['final']}"
        f"\ttable={table}\tselect={select}\tplans={len(plan['plans'])}"
        f"\tcalls={','.join(sorted(plan['code'])) or '-'}"
        f"\traw-table={plan['raw_table']}\traw-select={plan['raw_select']}"
        f"\tgrounding={plan['grounding']}\tread-ui={run['read_ui']}"
        f"\tread-services={run['read_services']}\tskill-called={run['skill']}"
        f"\tuntouched={run['untouched']}\tcc={run['cc']}\tmodels={run['models']}"
        f"\tcompactions={run['compactions']}\tasks={run['asks']}\tagents={run['agents']}"
    )
    return run


def collect(logs: Path) -> tuple[dict[str, list[dict[str, Any]]], int]:
    """Gather every run the logs name, split into pilot and counted.

    :param logs: The log directory.
    :returns: The runs keyed by ``pilot`` and ``counted``, and the number of
        named runs without a verdict.
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
    runs: dict[str, list[dict[str, Any]]] = {"pilot": [], "counted": []}
    missing = 0
    for group, label in (("pilot", "pilot (uncounted)"), ("counted", "counted")):
        print(f"{label}:")
        for log in sorted(logs.glob(f"{ARM}-*-[pr][0-9]*.log")):
            match = LOG_NAME.match(log.stem)
            if not match or match.group(1) != SCENARIO:
                continue
            proc = match.group(2)
            if (proc in PILOT_PROCS) != (group == "pilot"):
                continue
            for run_id in RUN_ID.findall(log.read_text(encoding="utf-8")):
                run = read_run(proc, run_id, superseded)
                if run is None:
                    missing += 1
                else:
                    runs[group].append(run)
    return runs, missing


def counted(runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop void attempts and superseded indeterminates.

    :param runs: The counted rows' runs.
    :returns: The runs that occupy a trial slot.
    """
    return [r for r in runs if not str(r["kind"]).startswith(("void-", "superseded-"))]


def reading(used: int, n: int) -> str:
    """Apply the README's decision table to the count of library-built plans.

    :param used: Sessions whose plan code calls both ``dataTable`` and
        ``selectField``.
    :param n: Sessions counted.
    :returns: The pre-registered reading.
    """
    if n == 10:
        if used <= 6:
            return "reproduces: plans do not build the page from the library"
        if used <= 8:
            return "extend once to n=20"
        return "does not reproduce"
    if n == 20:
        if used <= 15:
            return "reproduces: plans do not build the page from the library"
        if used <= 17:
            return "weak: the human partner decides"
        return "does not reproduce"
    return f"none yet: the table reads 10 or 20 counted sessions, not {n}"


def fisher_perfect(used: int, n: int) -> float:
    """One-sided Fisher p for a perfect fix (n of n) against this count.

    :param used: The baseline's library-built count.
    :param n: Sessions counted, the same in both arms.
    :returns: The probability of a perfect treatment row given the margins.
    """
    return comb(n, used) / comb(2 * n, n + used)


def report_pilot(runs: list[dict[str, Any]]) -> None:
    """Print the pilot's instrument check, which carries no reading.

    :param runs: The pilot's runs.
    """
    print()
    if not runs:
        print("pilot: not run")
        return
    for r in runs:
        print(
            f"pilot {r['run_id']}: pre-checks passed {r['pre_ok']};"
            f" both library records present {r['table'] is not None and r['select'] is not None};"
            f" plan record present {r['plan_record'] is not None};"
            f" skill-called record present {r['skill'] is not None};"
            f" grader wrote a result {r['graded']};"
            f" plan written {bool(r['plans'])};"
            f" used the library {r['kind'] == 'used'} (reported, no reading);"
            f" final {r['final']}"
        )


def report(runs: list[dict[str, Any]]) -> None:
    """Print the pre-registered reading and readouts for the counted rows.

    :param runs: The counted rows' runs.
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
    used = sum(r["kind"] == "used" for r in kept)
    finals = sum(r["final"] == "pass" for r in kept)
    no_skill = [r["run_id"] for r in kept if r["skill"] is not True]
    no_plan = [r["run_id"] for r in kept if not r["plans"]]
    invalid = sorted(set(no_skill) | set(no_plan))
    from_plan = [r["run_id"] for r in kept if r["from_plan"]]
    print(
        f"{SCENARIO}: used the library {used}/{n}; final {finals}/{n};"
        f" writing-plans skill-called {n - len(no_skill)}/{n}; plan written {n - len(no_plan)}/{n}"
    )
    print(
        "  read from the plan files for want of both records:"
        f" {', '.join(from_plan) or 'none'}"
    )
    print(
        f"  validity: no writing-plans Skill call or no plan {len(invalid)}/{n}"
        f" ({', '.join(invalid) or 'none'})"
    )
    # A session that never loads writing-plans, or never writes a plan, has not
    # been measured; it counts as not using the library only for want of a
    # plan. When more than a fifth of sessions are like that, the count no
    # longer measures the plans.
    if len(invalid) * 5 > n:
        print("  reading: none: the validity check failed; the human partner decides")
    else:
        print(f"  reading: {reading(used, n)}")
        if no_plan and reading(used, n) != reading(used + len(no_plan), n):
            print(
                "  the sessions without a plan decide the reading:"
                f" counted as using the library it would be {reading(used + len(no_plan), n)}"
            )
    print("  readouts, no reading attached:")
    print(
        f"    one-sided Fisher p for a perfect fix ({n}/{n}) against this count:"
        f" {fisher_perfect(used, n):.4f}"
    )
    disagree = [
        r["run_id"]
        for r in kept
        if not r["from_plan"]
        and bool(r["table"] and r["select"])
        != ({"dataTable(", "selectField("} <= r["code"])
    ]
    print(f"    records and plan files disagree: {', '.join(disagree) or 'none'}")
    for call in CALLS:
        print(f"    plan code calls {call}: {sum(call in r['code'] for r in kept)}/{n}")
    print(
        f"    plan code writes <table markup: {sum(r['raw_table'] for r in kept)}/{n}"
    )
    print(
        f"    plan code writes <select markup: {sum(r['raw_select'] for r in kept)}/{n}"
    )
    print(f"    plan names src/ui: {sum(r['names_ui'] for r in kept)}/{n}")
    print(f"    plan names services.js: {sum(r['names_services'] for r in kept)}/{n}")
    groundings = sorted({r["grounding"] for r in kept})
    print(
        "    Grounding section cites: "
        + "; ".join(f"{g} {sum(r['grounding'] == g for r in kept)}" for g in groundings)
    )
    print(f"    session read a src/ui file: {sum(r['read_ui'] for r in kept)}/{n}")
    print(f"    session read services.js: {sum(r['read_services'] for r in kept)}/{n}")
    skills = sorted({s for r in kept for s in r["skills"]})
    print(
        "    Skill calls: "
        + (
            "; ".join(f"{s} {sum(s in r['skills'] for r in kept)}" for s in skills)
            or "none"
        )
    )
    print(
        f"    AskUserQuestion: {sum(r['asks'] > 0 for r in kept)}/{n} sessions,"
        f" {sum(r['asks'] for r in kept)} calls"
    )
    print(
        f"    sessions dispatching an Agent: {sum(r['agents'] > 0 for r in kept)}/{n}"
    )
    changed = [r["run_id"] for r in kept if r["untouched"] is not True]
    print(
        f"    sessions that changed source, test, data or public files: {', '.join(changed) or 'none'}"
    )
    compacted = [r["run_id"] for r in kept if r["compactions"]]
    print(f"    sessions with an auto compaction: {', '.join(compacted) or 'none'}")
    failed_finals = [r["run_id"] for r in kept if r["final"] != "pass"]
    print(
        f"    sessions whose composed final did not pass: {', '.join(failed_finals) or 'none'}"
    )


def main() -> int:
    """Tally the campaign.

    :returns: Process exit status; 1 when a named run has no verdict.
    """
    runs, missing = collect(HERE / "logs")
    report_pilot(runs["pilot"])
    report(runs["counted"])
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
