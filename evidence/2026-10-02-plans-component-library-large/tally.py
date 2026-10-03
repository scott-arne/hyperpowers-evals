#!/usr/bin/env python3
"""Tally the plans-component-library-large campaign against its pre-registered rules.

Two arms are read, both run in this campaign: ``head`` (c89a2b7) and ``v612``
(hyperpowers v6.12.0). Run ids come from ``logs/<arm>-<scenario>-<proc>.log``
and resolve to ``runs/<arm>/<run-id>/``, or to ``results/<run-id>/`` in the
evals clone when not yet archived. A run id at the start of a line in
``superseded.txt`` is printed but not counted. Proc ``p0`` and its relaunch
``r0`` are the head pilot: printed with the instrument check, never counted.

A session counts as using the kit when both of its post-phase
``command-succeeds`` records for the plan's fenced code passed: the one that
greps for ``dataTable(`` and the one that greps for ``selectField(``. A counted
session missing either record is read from its plan files instead, with the
same fence rule and the same substring match, and named. A session that wrote
no plan counts as not using the kit and is named.

Each arm is read on its own bands (6 or fewer of 10 reproduces, 7 or 8 extends
both arms, 9 or 10 does not reproduce; 15 or fewer of 20 reproduces, 16 or 17
is weak, 18 or more does not reproduce), and the arms are compared with a
two-sided Fisher exact test at the final n.

The arm check: a session that loaded writing-plans must have loaded it from
its arm's worktree, and the loaded text must carry the Grounding instruction
exactly when the arm is ``head``. A counted session that fails it stops every
reading.

The readouts come from the plan files in the archived fixture and from the
session's main transcripts (subagent transcripts excluded), and carry no
reading. A Bash command counts as reading a file when one of its words is the
file's path or a glob that expands to it; a directory named for a recursive
search does not count, and the tool-result readout covers that case. The kit's
files are listed from each run's archived fixture.

Three readouts say how the kit was found, read from what the session saw (a
tool result's message content, which holds the preview when Claude Code moved
the output to a file): whether a tool result before the first plan write was
moved to a file, whether the session read such a file before the first plan
write, and the first tool call whose result named ``vendor/kit``.

Adapted from ``../2026-10-02-plans-component-library-hard/tally.py``: the
scenario, the kit's files read from the fixture, and the three found-by
readouts.
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
SCENARIO = "writing-plans-reuses-component-library-large"
ARMS = ("head", "v612")
PILOT_ARM = "head"
PILOT_PROCS = {"p0", "r0"}
EXPECTED_CC = "2.1.287"
EXPECTED_MODEL = "claude-opus-5-5"
SKILL_ROOTS = {
    "v612": "/.worktrees/plans-ui-612/skills/writing-plans",
    "head": "/.worktrees/plans-ui-baseline/skills/writing-plans",
}
GROUNDING_TEXT = "Ground the plan before you write it"
KIT_TABLE_SELECT_DIRS = ("vendor/kit/table/", "vendor/kit/select/")
PERSISTED = "<persisted-output>"
TOOL_RESULTS_DIR = "/tool-results/"
SERVICES = "src/pages/services.js"
WORKDIR = re.compile(r"[^\s'\"]*/coding-agent-workdir")
RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
LOG_NAME = re.compile(r"^(head|v612)-(.+)-([pr]\d+)$")
FENCE = re.compile(r"^\s*```")
GROUNDING = re.compile(r"^##\s+Grounding\b(.*?)(?=^##\s|\Z)", re.MULTILINE | re.DOTALL)
KIT_PATH = re.compile(r"vendor/kit|#kit/")
KIT_TABLE_PATH = re.compile(r"#kit/table\b|vendor/kit/table\b")
OTHER_PAGE = re.compile(r"src/pages/(?!services\.js|deploys\.js)[\w-]+\.js")
PILL = re.compile(r"class=\"pill\b|\bpill-(?:green|amber|red|grey)\b")
ESCAPE_HTML = re.compile(r"\bescapeHtml\b")
SKILL_BASE = re.compile(r"Base directory for this skill: ([^\s\"\\]+)")
WORD = re.compile(r"[^\s;|&<>()'\"=`]+")
PLAN_WRITE = re.compile(r"docs/[\w.-]+/plans/[\w.-]+\.md")
SEEN_CALLS = ("dataTable", "selectField")
PRIMARY = ("dataTable(", "selectField(")
CALLS = (
    "dataTable",
    "selectField",
    "filterBar",
    "badge",
    "emptyState",
    "pageHeader",
    "card",
)
CALL_PATTERNS = {name: re.compile(rf"\b{name}\(") for name in CALLS}
REPRODUCES = "reproduces"
WEAK = "weak"
NOT_REPRODUCED = "does not reproduce"
EXTEND = "extend both arms once to n=20"


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


def glob_regex(pattern: str) -> str:
    """Translate a shell glob into a regex the way the shell expands it.

    ``*`` and ``?`` stay within one path segment, ``**`` crosses segments, and
    ``{a,b}`` is either alternative (one level, no nesting).

    :param pattern: The glob.
    :returns: An anchored-by-caller regex.
    """
    regex = ""
    i = 0
    while i < len(pattern):
        if pattern.startswith("**", i):
            regex += ".*"
            i += 2
            continue
        char = pattern[i]
        if char == "{" and "}" in pattern[i:]:
            end = pattern.index("}", i)
            options = pattern[i + 1 : end].split(",")
            regex += "(?:" + "|".join(glob_regex(o) for o in options) + ")"
            i = end + 1
            continue
        regex += "[^/]*" if char == "*" else "[^/]" if char == "?" else re.escape(char)
        i += 1
    return regex


def command_names(command: str, path: str) -> bool:
    """Whether a Bash command names a file directly or through a glob.

    A word naming the path relative to the fixture root, or an absolute path
    inside the fixture's working directory, is matched; so is a glob in either
    form that expands to it.

    :param command: The Bash command.
    :param path: The file, relative to the fixture root.
    :returns: Whether the command names the file or a glob that expands to it.
    """
    if path in command:
        return True
    for word in WORD.findall(command):
        if "*" not in word and "?" not in word and "{" not in word:
            continue
        relative = word.removeprefix("./")
        marker = "/coding-agent-workdir/"
        if marker in relative:
            relative = relative[relative.index(marker) + len(marker) :]
        if re.fullmatch(glob_regex(relative), path):
            return True
    return False


def mirror_labels(text: str) -> set[str]:
    """Name what a plan's ``**Mirror:**`` lines cite.

    :param text: The plan files' text.
    :returns: Any of ``kit``, ``services.js``, ``another page`` and ``other``,
        one per kind cited; empty without a Mirror line.
    """
    labels: set[str] = set()
    for line in text.splitlines():
        if "**Mirror:**" not in line:
            continue
        found = False
        if KIT_PATH.search(line):
            labels.add("kit")
            found = True
        if "services.js" in line:
            labels.add("services.js")
            found = True
        if OTHER_PAGE.search(line):
            labels.add("another page")
            found = True
        if not found:
            labels.add("other")
    return labels


def plan_facts(path: Path) -> dict[str, Any]:
    """Read the session's plan files the way the post-checks do.

    Fenced code is every line between a pair of fence lines, with the fence
    state reset at the start of each file, as the checks' ``awk`` does.

    :param path: The run directory.
    :returns: ``plans`` (file names), ``primary`` (which of ``dataTable(`` and
        ``selectField(`` fenced code contains, as the checks' ``grep`` reads
        it), ``code`` (the names in ``CALLS`` that fenced code calls, matched
        at a word boundary), ``raw_table`` and ``raw_select`` (a fenced line
        writes ``<table`` or ``<select``), ``raw_table_code`` and
        ``raw_select_code`` (the same on a line without ``assert``), ``pill``
        and ``escape_html`` (fenced code uses the dashboard's pill classes or
        ``escapeHtml``), ``names_kit`` (the plan names ``vendor/kit`` or
        ``#kit/`` anywhere), ``names_kit_table`` (it names the kit's table),
        ``names_services`` (it names ``services.js``), ``grounding`` (``none``
        without a Grounding section, else which of the kit and
        ``services.js`` it names), and ``mirror`` (what its Mirror lines cite).
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
    outside_asserts = [line for line in code_lines if "assert" not in line]
    sections = GROUNDING.findall(text)
    if not sections:
        grounding = "none"
    else:
        cited = [
            label
            for label, hit in (
                ("kit", any(KIT_PATH.search(s) for s in sections)),
                ("services.js", any("services.js" in s for s in sections)),
            )
            if hit
        ]
        grounding = "+".join(cited) or "neither"
    return {
        "plans": [p.name for p in plans],
        "primary": {call for call in PRIMARY if call in code},
        "code": {
            name for name, pattern in CALL_PATTERNS.items() if pattern.search(code)
        },
        "raw_table": "<table" in code,
        "raw_select": "<select" in code,
        "raw_table_code": any("<table" in line for line in outside_asserts),
        "raw_select_code": any("<select" in line for line in outside_asserts),
        "pill": bool(PILL.search(code)),
        "escape_html": bool(ESCAPE_HTML.search(code)),
        "names_kit": bool(KIT_PATH.search(text)),
        "names_kit_table": bool(KIT_TABLE_PATH.search(text)),
        "names_services": "services.js" in text,
        "grounding": grounding,
        "mirror": mirror_labels(text),
    }


def kit_files(path: Path) -> tuple[str, ...]:
    """List the kit's files from a run's archived fixture.

    :param path: The run directory.
    :returns: Each ``.js`` file under ``vendor/kit/``, relative to the fixture
        root; empty when the fixture was not archived.
    """
    workdir = path / "coding-agent-workdir"
    return tuple(
        sorted(
            p.relative_to(workdir).as_posix()
            for p in (workdir / "vendor" / "kit").rglob("*.js")
        )
    )


def call_summary(name: str, tool_input: dict[str, Any]) -> str:
    """Summarize one tool call on one line, for the found-by readouts.

    :param name: The tool name.
    :param tool_input: The tool call's input.
    :returns: The tool name and what it was pointed at, with the fixture's
        absolute path shortened to ``.``.
    """
    if name == "Read":
        target = str(tool_input.get("file_path") or "")
        if TOOL_RESULTS_DIR in target:
            target = "persisted output file"
    elif name == "Bash":
        target = str(tool_input.get("command") or "")
    elif name in ("Grep", "Glob"):
        target = f"{tool_input.get('pattern') or ''} {tool_input.get('path') or ''}"
    else:
        return name
    target = " ".join(WORKDIR.sub(".", target).split())
    return f"{name} {target[:67] + '...' if len(target) > 70 else target}"


def tool_reads(name: str, tool_input: dict[str, Any], kit: tuple[str, ...]) -> set[str]:
    """Name what one tool call reads, for the read readouts.

    :param name: The tool name.
    :param tool_input: The tool call's input.
    :param kit: The kit's files, relative to the fixture root.
    :returns: Any of ``kit``, ``kit table/select``, ``services.js``,
        ``package.json`` and ``README``.
    """
    reads: set[str] = set()
    if name == "Read":
        file_path = str(tool_input.get("file_path") or "")
        if "/vendor/kit/" in file_path:
            reads.add("kit")
            if "/vendor/kit/table/" in file_path or "/vendor/kit/select/" in file_path:
                reads.add("kit table/select")
        if file_path.endswith("/" + SERVICES):
            reads.add("services.js")
        if file_path.endswith("/coding-agent-workdir/package.json"):
            reads.add("package.json")
        if file_path.endswith("/coding-agent-workdir/README.md"):
            reads.add("README")
    elif name == "Bash":
        command = str(tool_input.get("command") or "")
        if any(command_names(command, p) for p in kit):
            reads.add("kit")
        if any(
            command_names(command, p)
            for p in kit
            if p.startswith(KIT_TABLE_SELECT_DIRS)
        ):
            reads.add("kit table/select")
        if command_names(command, SERVICES):
            reads.add("services.js")
        if command_names(command, "package.json"):
            reads.add("package.json")
        if command_names(command, "README.md"):
            reads.add("README")
    return reads


def writes_plan(name: str, tool_input: dict[str, Any]) -> bool:
    """Whether a tool call names a plan file, the cut-off for the seen readout.

    Any tool call naming a ``docs/*/plans/*.md`` path counts, since sessions
    write plans through Bash heredocs as well as the Write tool; a call that
    only checks for a plan therefore ends the window early, never late.

    :param name: The tool name.
    :param tool_input: The tool call's input.
    :returns: Whether it names a plan file.
    """
    if name in ("Write", "Edit", "MultiEdit"):
        return bool(PLAN_WRITE.search(str(tool_input.get("file_path") or "")))
    return name == "Bash" and bool(
        PLAN_WRITE.search(str(tool_input.get("command") or ""))
    )


def transcript_facts(path: Path) -> dict[str, Any]:
    """Collect versions, models, the arm check, and the readouts.

    Read from a run's main transcripts, in order.

    :param path: The run directory.
    :returns: ``versions`` and ``models`` (sets), ``bases`` (the base
        directories writing-plans was loaded from), ``grounding_loaded`` (the
        Grounding instruction appears in the session), ``compactions`` (auto
        compactions), ``reads`` (what ``tool_reads`` names, over the session),
        ``saw_calls`` and ``saw_kit_path`` (a tool result before the first
        plan write showed ``dataTable`` or ``selectField``, or named
        ``vendor/kit``), ``persisted`` and ``read_persisted`` (before the
        first plan write, a tool result was moved to a file, or a tool call
        named such a file), ``found`` and ``alias`` (the earliest tool call
        before the first plan write whose input or result named
        ``vendor/kit``, and whose result named ``#kit/``, as its ordinal among
        the session's tool calls and its summary, or None), ``skills`` (Skill
        names called), ``asks`` (``AskUserQuestion`` calls), and ``agents``
        (``Agent`` or ``Task`` dispatches).
    """
    versions: set[str] = set()
    models: set[str] = set()
    skills: set[str] = set()
    bases: set[str] = set()
    reads: set[str] = set()
    kit = kit_files(path)
    calls: dict[str, tuple[int, str]] = {}
    facts: dict[str, Any] = {
        "grounding_loaded": False,
        "compactions": 0,
        "saw_calls": False,
        "saw_kit_path": False,
        "persisted": False,
        "read_persisted": False,
        "found": None,
        "alias": None,
        "asks": 0,
        "agents": 0,
    }

    def earliest(key: str, call: tuple[int, str]) -> None:
        # Parallel tool calls can return out of order, so the lowest ordinal
        # wins rather than the first one seen.
        if facts[key] is None or call[0] < facts[key][0]:
            facts[key] = call

    plan_written = False
    for transcript in sorted(path.glob("home/.claude/projects/*/*.jsonl")):
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
            if not isinstance(message, dict):
                continue
            content = message.get("content")
            if not isinstance(content, list):
                continue
            if entry.get("type") == "user":
                if plan_written:
                    continue
                for block in content:
                    if (
                        not isinstance(block, dict)
                        or block.get("type") != "tool_result"
                    ):
                        continue
                    result = json.dumps(block.get("content"), ensure_ascii=False)
                    if any(name in result for name in SEEN_CALLS):
                        facts["saw_calls"] = True
                    if PERSISTED in result:
                        facts["persisted"] = True
                    call = calls.get(str(block.get("tool_use_id") or ""))
                    if "vendor/kit" in result:
                        facts["saw_kit_path"] = True
                        if call:
                            earliest("found", call)
                    if "#kit/" in result and call:
                        earliest("alias", call)
                continue
            if entry.get("type") != "assistant":
                continue
            if isinstance(message.get("model"), str) and message["model"].startswith(
                "claude-"
            ):
                models.add(message["model"])
            for block in content:
                if not isinstance(block, dict) or block.get("type") != "tool_use":
                    continue
                name = str(block.get("name") or "")
                tool_input = block.get("input") or {}
                if not isinstance(tool_input, dict):
                    continue
                if name == "Skill":
                    skills.add(str(tool_input.get("skill") or ""))
                if name == "AskUserQuestion":
                    facts["asks"] += 1
                if name in ("Agent", "Task"):
                    facts["agents"] += 1
                reads |= tool_reads(name, tool_input, kit)
                if writes_plan(name, tool_input):
                    plan_written = True
                if plan_written:
                    continue
                call = (len(calls) + 1, call_summary(name, tool_input))
                calls[str(block.get("id") or "")] = call
                named = json.dumps(tool_input, ensure_ascii=False)
                if TOOL_RESULTS_DIR in named:
                    facts["read_persisted"] = True
                # `ls vendor` prints only `kit`, so a session that lists its
                # way down is found by the call that names the path.
                if "vendor/kit" in named:
                    earliest("found", call)
    facts["versions"] = versions
    facts["models"] = models
    facts["skills"] = skills
    facts["bases"] = bases
    facts["reads"] = reads
    return facts


def read_run(
    arm: str, proc: str, run_id: str, archive: Path, superseded: set[str]
) -> dict[str, Any] | None:
    """Read one run's verdict, plan and transcript facts, and print its row.

    :param arm: The arm the run counts toward.
    :param proc: The row's proc id.
    :param run_id: The quorum run id.
    :param archive: The arm's archive directory.
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
    used = set(PRIMARY) <= plan["primary"] if from_plan else bool(table and select)
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
                "reads",
                "saw_calls",
                "saw_kit_path",
                "persisted",
                "read_persisted",
                "found",
                "alias",
                "skills",
                "asks",
                "agents",
            )
        },
    }
    found = "{}:{}".format(*run["found"]) if run["found"] else "-"
    alias = "{}:{}".format(*run["alias"]) if run["alias"] else "-"
    source = "plan" if from_plan else "record"
    print(
        f"{arm}\t{proc}\t{run_id}\t{kind}\tfrom={source}\tfinal={run['final']}"
        f"\ttable={table}\tselect={select}\tplans={len(plan['plans'])}"
        f"\tcalls={','.join(sorted(plan['code'])) or '-'}"
        f"\traw-table={plan['raw_table']}/{plan['raw_table_code']}"
        f"\traw-select={plan['raw_select']}/{plan['raw_select_code']}"
        f"\tpill={plan['pill']}\tescapeHtml={plan['escape_html']}"
        f"\tgrounding={plan['grounding']}"
        f"\tmirror={','.join(sorted(plan['mirror'])) or '-'}"
        f"\tarm-ok={arm_ok}\tgrounding-loaded={run['grounding_loaded']}"
        f"\treads={','.join(sorted(run['reads'])) or '-'}"
        f"\tsaw-calls={run['saw_calls']}\tsaw-kit-path={run['saw_kit_path']}"
        f"\tpersisted={run['persisted']}\tread-persisted={run['read_persisted']}"
        f"\tfound={found}\talias={alias}"
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
    """Gather every run the logs name: the head pilot and each arm's rows.

    :returns: The runs keyed by ``pilot``, ``head`` and ``v612``, and the
        number of named runs without a verdict.
    """
    superseded = read_superseded(HERE)
    runs: dict[str, list[dict[str, Any]]] = {"pilot": [], "head": [], "v612": []}
    missing = 0
    for group, bucket in runs.items():
        print(f"{group} (uncounted):" if group == "pilot" else f"{group}:")
        arm = PILOT_ARM if group == "pilot" else group
        for log in sorted((HERE / "logs").glob(f"{arm}-*-[pr][0-9]*.log")):
            match = LOG_NAME.match(log.stem)
            if not match or match.group(1) != arm or match.group(2) != SCENARIO:
                continue
            proc = match.group(3)
            if (proc in PILOT_PROCS) != (group == "pilot"):
                continue
            for run_id in RUN_ID.findall(log.read_text(encoding="utf-8")):
                run = read_run(arm, proc, run_id, HERE / "runs" / arm, superseded)
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


def fisher_two_sided(a_used: int, a_n: int, b_used: int, b_n: int) -> float:
    """Two-sided Fisher exact p for two arms' counts.

    Sums the probability, given the margins, of every table no more likely
    than the one observed.

    :param a_used: One arm's kit-built count.
    :param a_n: That arm's counted sessions.
    :param b_used: The other arm's kit-built count.
    :param b_n: The other arm's counted sessions.
    :returns: The two-sided p.
    """
    total = a_n + b_n
    used = a_used + b_used

    def probability(x: int) -> float:
        return comb(used, x) * comb(total - used, a_n - x) / comb(total, a_n)

    observed = probability(a_used)
    return sum(
        p
        for x in range(max(0, used - b_n), min(used, a_n) + 1)
        if (p := probability(x)) <= observed * (1 + 1e-7)
    )


def band(used: int, n: int) -> str | None:
    """Apply one arm's reproduction bands.

    :param used: The arm's kit-built count.
    :param n: The arm's counted sessions.
    :returns: The band's reading, ``EXTEND`` at 7 or 8 of 10, or None when n is
        neither 10 nor 20.
    """
    if n == 10:
        return REPRODUCES if used <= 6 else EXTEND if used <= 8 else NOT_REPRODUCED
    if n == 20:
        return REPRODUCES if used <= 15 else WEAK if used <= 17 else NOT_REPRODUCED
    return None


def readings(counts: dict[str, tuple[int, int]]) -> dict[str, str]:
    """Apply the README's decision rules to both arms' counts.

    :param counts: Each arm's kit-built count and counted sessions.
    :returns: Each arm's reading and the comparison's, under ``comparison``.
    """
    ns = {n for _, n in counts.values()}
    if len(ns) != 1 or ns.pop() not in (10, 20):
        pending = (
            "none yet: the rules read 10 or 20 counted sessions in each arm, not "
            + " and ".join(f"{n} ({arm})" for arm, (_, n) in counts.items())
        )
        return {**{arm: pending for arm in counts}, "comparison": pending}
    bands = {arm: band(used, n) for arm, (used, n) in counts.items()}
    if EXTEND in bands.values():
        return {**{arm: f"pending: {EXTEND}" for arm in counts}, "comparison": EXTEND}
    (a, (a_used, a_n)), (b, (b_used, b_n)) = counts.items()
    p = fisher_two_sided(a_used, a_n, b_used, b_n)
    if p >= 0.05:
        comparison = f"not separated (two-sided Fisher p {p:.4f})"
    else:
        higher, lower = (a, b) if a_used / a_n > b_used / b_n else (b, a)
        comparison = (
            f"separated, {higher} uses the kit more than {lower}"
            f" (two-sided Fisher p {p:.4f})"
        )
    return {**{arm: str(bands[arm]) for arm in counts}, "comparison": comparison}


def consequence(head: str, v612: str) -> str:
    """Name the README's consequence for the head's and 6.12.0's readings.

    :param head: The head arm's reading.
    :param v612: The 6.12.0 arm's reading.
    :returns: The consequence the README keys to the pair.
    """
    if head == REPRODUCES:
        return (
            "head reproduces: the fixture is the failing baseline; no skill change"
            " from this campaign, the human partner decides whether to draft one"
        )
    if head == NOT_REPRODUCED and v612 == REPRODUCES:
        return (
            "head does not reproduce, v612 reproduces: the version avoids the"
            " failure on this fixture; no skill change"
        )
    if head == NOT_REPRODUCED and v612 == NOT_REPRODUCED:
        return (
            "neither reproduces: the four field cues at the field's size do not"
            " reproduce the failure; no skill change, the human partner decides"
            " whether the plan-writing half of item 2 closes"
        )
    return "the human partner's call"


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
            f" both kit records present {r['table'] is not None and r['select'] is not None};"
            f" plan record present {r['plan_record'] is not None};"
            f" skill-called record present {r['skill'] is not None};"
            f" grader wrote a result {r['graded']};"
            f" plan written {bool(r['plans'])};"
            f" writing-plans loaded from {', '.join(sorted(r['bases'])) or 'nowhere'};"
            f" Grounding instruction in the session {r['grounding_loaded']};"
            f" arm check passed {bool(r['bases']) and r['arm_ok']};"
            f" used the kit {r['kind'] == 'used'} (reported, no reading);"
            f" before the plan, a tool result moved to a file {r['persisted']},"
            f" such a file read {r['read_persisted']},"
            f" vendor/kit first named by {'call {}, {}'.format(*r['found']) if r['found'] else 'no call'}"
            f" (reported, no reading);"
            f" final {r['final']}; operator neutrality is checked by hand"
        )


def arm_summary(arm: str, runs: list[dict[str, Any]]) -> tuple[int, int, bool, bool]:
    """Print one arm's count, validity, and arm check.

    :param arm: The arm.
    :param runs: The arm's counted rows' runs.
    :returns: The kit-built count, the counted sessions, whether the validity
        rule holds, and whether the arm check holds.
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
        f"{arm}: used the kit {used}/{n}; final {finals}/{n};"
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
    print(f"  sessions without a plan: {', '.join(no_plan) or 'none'}")
    print(
        f"  validity: no writing-plans Skill call or no plan {len(invalid)}/{n}"
        f" ({', '.join(invalid) or 'none'})"
    )
    print(f"  arm check failed: {', '.join(wrong_arm) or 'none'}")
    # A session that never loads writing-plans, or never writes a plan, has not
    # been measured; when more than a fifth of an arm is like that, its count
    # no longer measures the plans.
    return used, n, n > 0 and len(invalid) * 5 <= n, not wrong_arm


def count_labels(kept: list[dict[str, Any]], key: str) -> str:
    """Count sessions per label for a set-valued fact.

    :param kept: An arm's counted runs.
    :param key: The fact holding each run's set of labels.
    :returns: ``label count`` pairs, or ``none``.
    """
    labels = sorted({label for r in kept for label in r[key]})
    return (
        "; ".join(f"{label} {sum(label in r[key] for r in kept)}" for label in labels)
        or "none"
    )


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
        and bool(r["table"] and r["select"]) != (set(PRIMARY) <= r["primary"])
    ]
    print(f"    records and plan files disagree: {', '.join(disagree) or 'none'}")
    for name in CALLS:
        print(
            f"    plan code calls {name}(: {sum(name in r['code'] for r in kept)}/{n}"
        )
    for tag, key in (("<table", "raw_table"), ("<select", "raw_select")):
        print(
            f"    plan code writes {tag} markup: {sum(r[key] for r in kept)}/{n};"
            f" outside assertions {sum(r[key + '_code'] for r in kept)}/{n}"
        )
    print(f"    plan code uses the pill classes: {sum(r['pill'] for r in kept)}/{n}")
    print(f"    plan code uses escapeHtml: {sum(r['escape_html'] for r in kept)}/{n}")
    print(
        f"    plan names vendor/kit or #kit/: {sum(r['names_kit'] for r in kept)}/{n}"
    )
    print(
        f"    plan names the kit's table: {sum(r['names_kit_table'] for r in kept)}/{n}"
    )
    print(f"    plan names services.js: {sum(r['names_services'] for r in kept)}/{n}")
    groundings = sorted({r["grounding"] for r in kept})
    print(
        "    Grounding section cites: "
        + "; ".join(f"{g} {sum(r['grounding'] == g for r in kept)}" for g in groundings)
    )
    print(
        f"    Mirror lines cite: {count_labels(kept, 'mirror')};"
        f" no Mirror line {sum(not r['mirror'] for r in kept)}"
    )
    print(f"    session read: {count_labels(kept, 'reads')} (of {n})")
    print(
        "    before the first plan write, a tool result showed dataTable or selectField:"
        f" {sum(r['saw_calls'] for r in kept)}/{n}; named vendor/kit:"
        f" {sum(r['saw_kit_path'] for r in kept)}/{n}; either:"
        f" {sum(r['saw_calls'] or r['saw_kit_path'] for r in kept)}/{n}"
    )
    print(
        "    before the first plan write, a tool result was moved to a file:"
        f" {sum(r['persisted'] for r in kept)}/{n}; a tool call named such a file:"
        f" {sum(r['read_persisted'] for r in kept)}/{n}"
    )
    found = [r for r in kept if r["found"]]
    tools = sorted({r["found"][1].split()[0] for r in found})
    print(
        "    before the first plan write, a tool call's input or result named"
        f" vendor/kit: {len(found)}/{n}; first by "
        + (
            "; ".join(
                f"{t} {sum(r['found'][1].split()[0] == t for r in found)}"
                for t in tools
            )
            or "none"
        )
        + "; by the persisted output file"
        f" {sum('persisted output file' in r['found'][1] for r in found)}"
    )
    print(
        "    before the first plan write, a tool result showed #kit/:"
        f" {sum(bool(r['alias']) for r in kept)}/{n}; before vendor/kit was named"
        f" {sum(bool(r['alias']) and (not r['found'] or r['alias'][0] < r['found'][0]) for r in kept)}/{n}"
    )
    for r in found:
        print(f"      {r['run_id']} found at call {r['found'][0]}: {r['found'][1]}")
    print(f"    Skill calls: {count_labels(kept, 'skills')}")
    print(
        f"    AskUserQuestion: {sum(r['asks'] > 0 for r in kept)}/{n} sessions,"
        f" {sum(r['asks'] for r in kept)} calls"
    )
    print(
        f"    sessions dispatching an Agent: {sum(r['agents'] > 0 for r in kept)}/{n}"
    )
    changed = [r["run_id"] for r in kept if r["untouched"] is not True]
    print(
        "    sessions that changed source, test, data, public, vendored, pipeline,"
        f" tool or script files or package.json: {', '.join(changed) or 'none'}"
    )
    compacted = [r["run_id"] for r in kept if r["compactions"]]
    print(f"    sessions with an auto compaction: {', '.join(compacted) or 'none'}")
    failed_finals = [r["run_id"] for r in kept if r["final"] != "pass"]
    print(
        f"    sessions whose composed final did not pass: {', '.join(failed_finals) or 'none'}"
    )


def report(runs: dict[str, list[dict[str, Any]]]) -> None:
    """Print each arm's summary, the readings, and the readouts.

    :param runs: The counted runs keyed by arm.
    """
    print()
    counts: dict[str, tuple[int, int]] = {}
    valid: dict[str, bool] = {}
    arms_ok = True
    for arm in ARMS:
        used, n, arm_valid, arm_ok = arm_summary(arm, runs[arm])
        counts[arm] = (used, n)
        valid[arm] = arm_valid
        arms_ok = arms_ok and arm_ok
    print()
    if not all(n for _, n in counts.values()):
        print("readings: none yet, an arm has no counted sessions")
    elif not arms_ok:
        print("readings: none: the arm check failed; the human partner decides")
    else:
        result = readings(counts)
        final = result["comparison"] != EXTEND and not result["comparison"].startswith(
            "none yet"
        )
        for arm in ARMS:
            if not valid[arm]:
                result[arm] = (
                    "none: the validity rule failed; the human partner decides"
                )
                result["comparison"] = "none: an arm failed the validity rule"
        for arm in ARMS:
            print(f"{arm} reading: {result[arm]}")
        print(f"comparison reading: {result['comparison']}")
        print(
            "consequence: "
            + (consequence(result["head"], result["v612"]) if final else "none yet")
        )
        for arm in ARMS:
            no_plan = sum(not r["plans"] for r in counted(runs[arm]))
            if not no_plan or not valid[arm]:
                continue
            used, n = counts[arm]
            alternative = readings({**counts, arm: (used + no_plan, n)})
            keys = (arm, "comparison") if all(valid.values()) else (arm,)
            for key in keys:
                if alternative[key] != result[key]:
                    print(
                        f"  the {arm} sessions without a plan decide the {key} reading:"
                        f" counted as using the kit it would be {alternative[key]}"
                    )
    (head_used, head_n), (v612_used, v612_n) = counts["head"], counts["v612"]
    if head_n and v612_n:
        print(
            f"  two-sided Fisher p, head {head_used}/{head_n} against v612 {v612_used}/{v612_n}:"
            f" {fisher_two_sided(head_used, head_n, v612_used, v612_n):.4f}"
        )
    print()
    for arm in ARMS:
        if counted(runs[arm]):
            readouts(arm, runs[arm])


def main() -> int:
    """Tally the campaign.

    :returns: Process exit status; 1 when a named run has no verdict.
    """
    runs, missing = collect()
    report_pilot(runs["pilot"])
    report({arm: runs[arm] for arm in ARMS})
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
