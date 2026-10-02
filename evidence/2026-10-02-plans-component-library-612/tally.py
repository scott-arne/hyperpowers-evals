#!/usr/bin/env python3
"""Tally the plans-component-library 6.12.0 arm against its pre-registered rules.

Two arms are read. ``v612`` is this campaign's: run ids come from
``logs/v612-<scenario>-<proc>.log`` and resolve to ``runs/v612/<run-id>/``.
``head`` is the release head c89a2b7: its counted sessions are the baseline
campaign's (``../2026-10-02-plans-component-library-baseline/logs/control-*``,
archived under that directory's ``runs/control/``), plus any extension rows
this campaign runs (``logs/head-*``, archived under ``runs/head/``). A run not
yet archived resolves to ``results/<run-id>/`` in the evals clone. A run id at
the start of a line in either campaign's ``superseded.txt`` is printed but not
counted. Proc ``p0`` and its relaunch ``r0`` are pilots: this campaign's v612
pilot is printed with the instrument check, the baseline's is skipped, and
neither carries a reading.

A session counts as using the library when both of its post-phase
``command-succeeds`` records for the plan's fenced code passed: the one that
greps for ``dataTable(`` and the one that greps for ``selectField(``. A counted
session missing either record is read from its plan files instead, with the
same fence rule, and named. A session that wrote no plan counts as not using
the library and is named.

The arm check: a session that loaded writing-plans must have loaded it from
its arm's worktree, and the loaded text must carry the Grounding instruction
exactly when the arm is ``head``. A counted session that fails it stops the
reading.

The readouts come from the plan files in the archived fixture and from the
session's main transcripts (subagent transcripts excluded), and carry no
reading.

Adapted from ``../2026-10-02-plans-component-library-baseline/tally.py``: the
arms, the comparison reading, the arm check, the Mirror readout, and the
glob-aware read readouts differ.
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
BASELINE = HERE.parent / "2026-10-02-plans-component-library-baseline"
SCENARIO = "writing-plans-reuses-component-library"
PILOT_PROCS = {"p0", "r0"}
EXPECTED_CC = "2.1.287"
EXPECTED_MODEL = "claude-opus-5-5"
SKILL_ROOTS = {
    "v612": "/.worktrees/plans-ui-612/skills/writing-plans",
    "head": "/.worktrees/plans-ui-baseline/skills/writing-plans",
}
GROUNDING_TEXT = "Ground the plan before you write it"
# Each source: the arm it counts toward, its log directory, the arm name its
# log files carry, and its archive directory.
SOURCES = (
    ("v612", HERE / "logs", "v612", HERE / "runs" / "v612"),
    ("head", BASELINE / "logs", "control", BASELINE / "runs" / "control"),
    ("head", HERE / "logs", "head", HERE / "runs" / "head"),
)
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
LOG_NAME = re.compile(r"^(v612|head|control)-(.+)-([pr]\d+)$")
FENCE = re.compile(r"^\s*```")
GROUNDING = re.compile(r"^##\s+Grounding\b(.*?)(?=^##\s|\Z)", re.MULTILINE | re.DOTALL)
UI_PATH = re.compile(r"\bsrc/ui\b")
SKILL_BASE = re.compile(r"Base directory for this skill: ([^\s\"\\]+)")
SRC_TOKEN = re.compile(r"[\w./*?-]*src/[\w./*?-]*")
CALLS = ("dataTable(", "selectField(", "statusChip(", "emptyState(", "filterBar(")
SEPARATED = (
    "separated: 6.12.0 reproduces the failure on this fixture, and the release"
    " head does not"
)
NOT_SEPARATED = (
    "not separated: 6.12.0 also builds the page from the library, so the"
    " fixture cannot tell the versions apart"
)


def run_dir(archive: Path, run_id: str) -> Path:
    """Resolve a run to its archive, falling back to the live results tree.

    :param archive: The arm's archive directory.
    :param run_id: The quorum run id.
    :returns: The directory holding the run's ``verdict.json``.
    """
    archived = archive / run_id
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


def glob_matches(pattern: str, path: str) -> bool:
    """Match a shell glob against a relative path the way the shell expands it.

    ``*`` and ``?`` stay within one path segment; ``**`` crosses segments.

    :param pattern: The glob, relative to the fixture root.
    :param path: The path to test.
    :returns: Whether the glob would expand to the path.
    """
    regex = ""
    i = 0
    while i < len(pattern):
        if pattern.startswith("**", i):
            regex += ".*"
            i += 2
            continue
        char = pattern[i]
        regex += "[^/]*" if char == "*" else "[^/]" if char == "?" else re.escape(char)
        i += 1
    return re.fullmatch(regex, path) is not None


def command_names(command: str, path: str) -> bool:
    """Whether a Bash command names a file directly or through a ``src/`` glob.

    :param command: The Bash command.
    :param path: The file, relative to the fixture root.
    :returns: Whether the command names the file or a glob that expands to it.
    """
    if path in command:
        return True
    for token in SRC_TOKEN.findall(command):
        relative = token[token.index("src/") :]
        if ("*" in relative or "?" in relative) and glob_matches(relative, path):
            return True
    return False


def plan_facts(path: Path) -> dict[str, Any]:
    """Read the session's plan files the way the post-checks do.

    Fenced code is every line between a pair of fence lines, with the fence
    state reset at the start of each file, as the checks' ``awk`` does.

    :param path: The run directory.
    :returns: ``plans`` (file names), ``code`` (the calls in ``CALLS`` found in
        fenced code), ``raw_table`` and ``raw_select`` (fenced code writes its
        own ``<table`` or ``<select`` markup), ``names_ui`` (the plan names
        ``src/ui`` anywhere), ``names_services`` (the plan names
        ``services.js`` anywhere), ``grounding`` (``none`` without a Grounding
        section, else which of ``src/ui`` and ``services.js`` it names), and
        ``mirror`` (the plan has a ``**Mirror:**`` line).
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
        "mirror": "**Mirror:**" in text,
    }


def transcript_facts(path: Path) -> dict[str, Any]:
    """Collect versions, models, the arm check, and the readouts.

    Read from a run's main transcripts.

    :param path: The run directory.
    :returns: ``versions`` and ``models`` (sets), ``bases`` (the base
        directories writing-plans was loaded from), ``grounding_loaded`` (the
        Grounding instruction appears in the session), ``compactions`` (auto
        compactions), ``read_ui`` (a Read of a ``src/ui/`` file, or a Bash
        command naming ``src/ui`` or a ``src/`` glob that expands to a library
        file), ``read_services`` (the same for ``src/pages/services.js``),
        ``skills`` (Skill names called), ``asks`` (``AskUserQuestion`` calls),
        and ``agents`` (``Agent`` or ``Task`` dispatches).
    """
    versions: set[str] = set()
    models: set[str] = set()
    skills: set[str] = set()
    bases: set[str] = set()
    facts: dict[str, Any] = {
        "grounding_loaded": False,
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
            bases.update(
                b
                for b in SKILL_BASE.findall(line)
                if b.endswith("/skills/writing-plans")
            )
            if GROUNDING_TEXT in line:
                facts["grounding_loaded"] = True
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
                if (
                    (name == "Read" and "/src/ui/" in file_path)
                    or UI_PATH.search(command)
                    or command_names(command, "src/ui/table.js")
                ):
                    facts["read_ui"] = True
                if (
                    name == "Read" and file_path.endswith("src/pages/services.js")
                ) or command_names(command, "src/pages/services.js"):
                    facts["read_services"] = True
    facts["versions"] = versions
    facts["models"] = models
    facts["skills"] = skills
    facts["bases"] = bases
    return facts


def read_run(
    arm: str, proc: str, run_id: str, archive: Path, superseded: set[str]
) -> dict[str, Any] | None:
    """Read one run's verdict, plan and transcript facts, and print its row.

    :param arm: The arm the run counts toward.
    :param proc: The row's proc id.
    :param run_id: The quorum run id.
    :param archive: The arm's archive directory for this source.
    :param superseded: Run ids replaced by their re-run.
    :returns: The run, or None when it has no verdict.
    """
    path = run_dir(archive, run_id)
    verdict_path = path / "verdict.json"
    if not verdict_path.is_file():
        print(f"{arm}\t{proc}\t{run_id}\tNO VERDICT")
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
    # A session that never loaded writing-plans has no load to check; the
    # validity rule covers it.
    arm_ok = not facts["bases"] or (
        all(b.endswith(SKILL_ROOTS[arm]) for b in facts["bases"])
        and facts["grounding_loaded"] == (arm == "head")
    )
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
        "arm": arm,
        "run_id": run_id,
        "proc": proc,
        "kind": kind,
        "table": table,
        "select": select,
        "from_plan": from_plan,
        "arm_ok": arm_ok,
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
                "bases",
                "grounding_loaded",
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
        f"{arm}\t{proc}\t{run_id}\t{kind}\tfrom={source}\tfinal={run['final']}"
        f"\ttable={table}\tselect={select}\tplans={len(plan['plans'])}"
        f"\tcalls={','.join(sorted(plan['code'])) or '-'}"
        f"\traw-table={plan['raw_table']}\traw-select={plan['raw_select']}"
        f"\tgrounding={plan['grounding']}\tmirror={plan['mirror']}"
        f"\tarm-ok={arm_ok}\tgrounding-loaded={run['grounding_loaded']}"
        f"\tread-ui={run['read_ui']}\tread-services={run['read_services']}"
        f"\tskill-called={run['skill']}\tuntouched={run['untouched']}"
        f"\tcc={run['cc']}\tmodels={run['models']}\tcompactions={run['compactions']}"
        f"\tasks={run['asks']}\tagents={run['agents']}"
    )
    return run


def read_superseded(directory: Path) -> set[str]:
    """Read the run ids a campaign lists as superseded.

    :param directory: The campaign's evidence directory.
    :returns: The run ids at the start of each non-blank line, if the file exists.
    """
    path = directory / "superseded.txt"
    if not path.is_file():
        return set()
    return {
        line.split()[0]
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }


def collect() -> tuple[dict[str, list[dict[str, Any]]], int]:
    """Gather every run the logs name: the v612 pilot and each arm's rows.

    :returns: The runs keyed by ``pilot``, ``v612`` and ``head``, and the
        number of named runs without a verdict.
    """
    superseded = read_superseded(HERE) | read_superseded(BASELINE)
    runs: dict[str, list[dict[str, Any]]] = {"pilot": [], "v612": [], "head": []}
    missing = 0
    for group, bucket in runs.items():
        print(f"{group} (uncounted):" if group == "pilot" else f"{group}:")
        for arm, logs, prefix, archive in SOURCES:
            if arm != ("v612" if group == "pilot" else group):
                continue
            for log in sorted(logs.glob(f"{prefix}-*-[pr][0-9]*.log")):
                match = LOG_NAME.match(log.stem)
                if not match or match.group(1) != prefix or match.group(2) != SCENARIO:
                    continue
                proc = match.group(3)
                if (proc in PILOT_PROCS) != (group == "pilot"):
                    continue
                for run_id in RUN_ID.findall(log.read_text(encoding="utf-8")):
                    run = read_run(arm, proc, run_id, archive, superseded)
                    if run is None:
                        missing += 1
                    else:
                        bucket.append(run)
    return runs, missing


def counted(runs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Drop void attempts and superseded indeterminates.

    :param runs: An arm's counted rows' runs.
    :returns: The runs that occupy a trial slot.
    """
    return [r for r in runs if not str(r["kind"]).startswith(("void-", "superseded-"))]


def fisher_one_sided(head_used: int, head_n: int, v612_used: int, v612_n: int) -> float:
    """One-sided Fisher p that the head uses the library more than 6.12.0.

    :param head_used: The head arm's library-built count.
    :param head_n: The head arm's counted sessions.
    :param v612_used: The 6.12.0 arm's library-built count.
    :param v612_n: The 6.12.0 arm's counted sessions.
    :returns: The probability, given the margins, of a head count at least
        this high.
    """
    total = head_n + v612_n
    used = head_used + v612_used
    tail = sum(
        comb(used, x) * comb(total - used, head_n - x)
        for x in range(head_used, min(used, head_n) + 1)
    )
    return tail / comb(total, head_n)


def reading(v612_used: int, v612_n: int, head_used: int, head_n: int) -> str:
    """Apply the README's decision rules to the two arms' counts.

    :param v612_used: The 6.12.0 arm's library-built count.
    :param v612_n: The 6.12.0 arm's counted sessions.
    :param head_used: The head arm's library-built count.
    :param head_n: The head arm's counted sessions.
    :returns: The pre-registered reading.
    """
    if v612_n == 10 and head_n == 10:
        # The n=10 bands assume the baseline's 10 of 10 for the head.
        if head_used != 10:
            return "none: the head count is not the baseline's 10 of 10; the human partner decides"
        if v612_used <= 6:
            return SEPARATED
        if v612_used <= 8:
            return "extend both arms once to n=20"
        return NOT_SEPARATED
    if v612_n == 20 and head_n == 20:
        if v612_used >= 18:
            return NOT_SEPARATED
        if fisher_one_sided(head_used, head_n, v612_used, v612_n) < 0.05:
            return SEPARATED
        return "weak: the human partner decides"
    return (
        "none yet: the rules read 10 or 20 counted sessions in each arm,"
        f" not {v612_n} (v612) and {head_n} (head)"
    )


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
            f" writing-plans loaded from {', '.join(sorted(r['bases'])) or 'nowhere'};"
            f" Grounding instruction in the session {r['grounding_loaded']};"
            f" arm check passed {bool(r['bases']) and r['arm_ok']};"
            f" used the library {r['kind'] == 'used'} (reported, no reading);"
            f" final {r['final']}"
        )


def arm_summary(arm: str, runs: list[dict[str, Any]]) -> tuple[int, int, bool]:
    """Print one arm's count, validity, and arm check.

    :param arm: The arm.
    :param runs: The arm's counted rows' runs.
    :returns: The library-built count, the counted sessions, and whether the
        arm's validity and arm checks both hold.
    """
    kept = counted(runs)
    n = len(kept)
    used = sum(r["kind"] == "used" for r in kept)
    finals = sum(r["final"] == "pass" for r in kept)
    no_skill = [r["run_id"] for r in kept if r["skill"] is not True]
    no_plan = [r["run_id"] for r in kept if not r["plans"]]
    invalid = sorted(set(no_skill) | set(no_plan))
    wrong_arm = [r["run_id"] for r in kept if not r["arm_ok"]]
    from_plan = [r["run_id"] for r in kept if r["from_plan"]]
    off_model = [r["run_id"] for r in kept if r["models"] != EXPECTED_MODEL]
    print(
        f"{arm}: used the library {used}/{n}; final {finals}/{n};"
        f" writing-plans skill-called {n - len(no_skill)}/{n}; plan written {n - len(no_plan)}/{n}"
    )
    print(
        f"  voided for a Claude Code version other than {EXPECTED_CC} alone:"
        f" {', '.join(r['run_id'] for r in runs if r['kind'] == 'void-version') or 'none'}"
    )
    print(
        f"  counted sessions not on {EXPECTED_MODEL} alone: {', '.join(off_model) or 'none'}"
    )
    print(
        f"  read from the plan files for want of both records: {', '.join(from_plan) or 'none'}"
    )
    print(
        f"  validity: no writing-plans Skill call or no plan {len(invalid)}/{n}"
        f" ({', '.join(invalid) or 'none'})"
    )
    print(f"  arm check failed: {', '.join(wrong_arm) or 'none'}")
    # A session that never loads writing-plans, or never writes a plan, has not
    # been measured; when more than a fifth of an arm is like that, its count
    # no longer measures the plans.
    return used, n, n > 0 and len(invalid) * 5 <= n and not wrong_arm


def readouts(arm: str, runs: list[dict[str, Any]]) -> None:
    """Print one arm's readouts, which carry no reading.

    :param arm: The arm.
    :param runs: The arm's counted rows' runs.
    """
    kept = counted(runs)
    n = len(kept)
    print(f"  {arm} readouts, no reading attached:")
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
    print(f"    plan has a **Mirror:** line: {sum(r['mirror'] for r in kept)}/{n}")
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


def report(runs: dict[str, list[dict[str, Any]]]) -> None:
    """Print each arm's summary, the comparison reading, and the readouts.

    :param runs: The counted runs keyed by arm.
    """
    print()
    v612_used, v612_n, v612_valid = arm_summary("v612", runs["v612"])
    head_used, head_n, head_valid = arm_summary("head", runs["head"])
    print()
    if not v612_n or not head_n:
        print("comparison: none yet, an arm has no counted sessions")
    elif not (v612_valid and head_valid):
        print(
            "comparison reading: none: the validity or arm check failed; the human partner decides"
        )
    else:
        verdict = reading(v612_used, v612_n, head_used, head_n)
        print(f"comparison reading: {verdict}")
        no_plan = sum(not r["plans"] for r in counted(runs["v612"]))
        alternative = reading(v612_used + no_plan, v612_n, head_used, head_n)
        if no_plan and alternative != verdict:
            print(
                "  the v612 sessions without a plan decide the reading:"
                f" counted as using the library it would be {alternative}"
            )
    if v612_n and head_n:
        print(
            f"  one-sided Fisher p, head {head_used}/{head_n} above v612 {v612_used}/{v612_n}:"
            f" {fisher_one_sided(head_used, head_n, v612_used, v612_n):.4f}"
        )
    print()
    for arm in ("v612", "head"):
        if counted(runs[arm]):
            readouts(arm, runs[arm])


def main() -> int:
    """Tally the campaign.

    :returns: Process exit status; 1 when a named run has no verdict.
    """
    runs, missing = collect()
    report_pilot(runs["pilot"])
    report({"v612": runs["v612"], "head": runs["head"]})
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
