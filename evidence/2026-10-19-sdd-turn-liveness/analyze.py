"""Per-run measures for the sdd-turn-liveness scenario (spec Design §2).

A run is a quorum record directory, ``<root>/<run>/`` holding
``verdict.json``, beside its workspace ``<root>/workspaces/<run>/`` (the
relocated layout that ``results/`` and an evidence archive share; a record
without a workspace sibling is read as its own workspace). ``measure`` reads
the verdict, the launch command, the main transcript, the SDD ledger and the
Gauntlet-Agent's result, and returns every measure the decision rule uses
plus the provenance fields the tally checks against the campaign pin. It
decides nothing.

A premature stop is a turn end before the plan's last task completes, with
no live and no censored task, that the Gauntlet-Agent's ``STOP:`` list labels
``neither``. A candidate the list does not match needs a row in
``adjudications.tsv``; until it has one it is ``unadjudicated`` and the tally
refuses to decide.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
import shlex
import sys
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass, replace
from datetime import datetime
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from liveness import (
    LAUNCH_AGENT,
    LAUNCH_BASH,
    LAUNCH_BASH_AUTO,
    Record,
    asks_or_blocks,
    blocks,
    is_tool_result,
    load,
    parse_ts,
    reloads,
    result_text,
    state_at,
    tasks,
    tool_input,
    tool_uses,
    turn_ends,
)

LAST_TASK = 6
TASK_LINE = re.compile(r"^Task (\d+): complete\b", re.MULTILINE)
MARK = re.compile(r"\bTask (\d+): complete\b")
LEDGER_FILE = "progress.md"
SHORT_SOAK = "test_soak_short"
LONG_SOAK = "test_soak_long"
SHORT_RUNTIME_MS = 240_000
LONG_RUNTIME_MS = 720_000
SHORT_MIN_ELAPSED_S = 200
LONG_MIN_ELAPSED_S = 600
TRANSPORT_ERRORS = ("ECONNRESET", "ENOTFOUND", "ETIMEDOUT", "ECONNREFUSED")
SOAK_FILES = ("test_soak_short.py", "test_soak_long.py")
UNITTEST_CMD = re.compile(
    r"(?:^|[;&|(\n])\s*(?:\w+=\S*\s+)*(?:nohup\s+|timeout\s+\S+\s+)*(?:\S*/)?python3?\s+-m\s+unittest\b([^\n;|&]*)"
)
BASH_DEFAULT_TIMEOUT_MS = 120_000
UNIT_TESTS = "test_unit_"
SOAK_SHORT_CHECK = "tests.test_soak_short"
SOAK_LONG_CHECK = "tests.test_soak_long"
SOAKS_UNCHANGED = "quorum-recorded-head"
CODEX_PRECHECK = "codex@openai-codex"
CODEX_CACHE_CHECK = "plugins/cache/openai-codex"
WRITERS = ("Write", "Edit", "MultiEdit")
SDD_ROLE = re.compile(r"implement|review|fix|takeover", re.IGNORECASE)
FIX = re.compile(r"\bfix", re.IGNORECASE)
REVIEW = re.compile(r"review", re.IGNORECASE)
IMPLEMENT = re.compile(r"implement|takeover", re.IGNORECASE)
TASK_REF = re.compile(r"\bTask\s*#?\d+", re.IGNORECASE)
LEDGER_DIR = "hyperpowers/sdd/"
ASSIGN = re.compile(r"(?:^|[\s;&|(])(\w+)=(?:\"([^\"]*)\"|'([^']*)'|([^\s;&|<>()'\"]*))")
VAR_REF = re.compile(r"\$\{(\w+)\}|\$(\w+)")
READ_ONLY = frozenset({
    "cat", "head", "tail", "grep", "egrep", "fgrep", "rg", "less", "more", "wc", "diff", "cmp",
    "ls", "stat", "file", "sha256sum", "shasum", "md5", "md5sum", "test", "[", "pytest",
    "echo", "printf", "nl", "cut", "true",
})
READ_ONLY_GIT = frozenset({"diff", "show", "log", "status", "blame", "ls-files", "grep", "cat-file"})
GIT_VALUE_OPTIONS = ("-C", "-c", "--git-dir", "--work-tree")
COMMAND_PREFIXES = frozenset({"env", "nohup", "time", "timeout"})
SED_IN_PLACE = re.compile(r"-[A-Za-z]*i|--in-place")
EXIT_ZERO = re.compile(r"\bexit=0(?!\d)")
STOP_LINE = re.compile(
    r"STOP:\s*\"(?P<quote>[^\"\n]+)\"\s*\|\s*(?P<label>question|blocked|neither)", re.IGNORECASE
)
PLUGIN_DIR = re.compile(r'--plugin-dir\s+"([^"]+)"')
MODEL = re.compile(r'--model\s+"([^"]+)"')
HEREDOC = re.compile(r"<<-?\s*(['\"]?)(\w+)\1[^\n]*\n(.*?)\n[ \t]*\2[ \t]*(?=\n|$)", re.DOTALL)
QUOTED = re.compile(r"'[^']*'|\"(?:\\.|[^\"\\])*\"")
SAFE_AMP = re.compile(r"&&|[0-9]*>&[0-9-]*|&>>?|<&|\|&")
CMD_DETACH = re.compile(r"(?:^|[;|(]|&&)\s*(?:nohup|setsid|disown)\b", re.MULTILINE)
PY_DETACH = re.compile(r"start_new_session\s*=\s*True|os\.setsid\s*\(|os\.fork\s*\(")
WRITE_TARGET = re.compile(r"(?:>{1,2}|\btee\s+(?:-a\s+)?)\s*(['\"]?)([^\s'\"<>|;&]+)\1")
REDIRECT = re.compile(r"(?<![<>&0-9])>{1,2}\s*(['\"]?)([^\s'\"<>|;&()]+)\1")
OUT_TARGET = re.compile(r">\s*(['\"]?)([^\s'\";|&<>]+)\1\s*2>&1")
SH_C = re.compile(r"\b(?:bash|sh|zsh)\s+-c\s+(['\"])(.*?)(?<!\\)\1", re.DOTALL)
UNICODE_QUOTES = {"\u2018": "'", "\u2019": "'", "\u201c": "'", "\u201d": "'", '"': "'"}
PRINTF_FORMAT = re.compile(r"\bprintf\s+(?:-v\s+\w+\s+)?(?:--\s+)?('[^']*'|\"(?:\\.|[^\"\\])*\")")
ECHO_E = re.compile(r"\becho\s+((?:-[a-zA-Z]+\s+)+)")
ANSI_C = re.compile(r"\$'((?:\\.|[^'\\])*)'")
ESCAPE = re.compile(r"(?<!\\)((?:\\\\)*)\\([nrt])")
ESCAPES = {"n": "\n", "r": "\r", "t": "\t"}


@dataclass(frozen=True)
class Call:
    """One main-session tool call and its result, if one was recorded."""

    tool_id: str
    at: datetime
    name: str
    inp: dict[str, Any]
    result_at: datetime | None = None
    result: str | None = None
    error: bool = False


def iso(value: datetime) -> str:
    return value.isoformat()


def workspace_of(record: Path) -> Path:
    """The run's workspace: ``<root>/workspaces/<run>/``, or the record itself (legacy)."""
    relocated = record.parent / "workspaces" / record.name
    return relocated if relocated.is_dir() else record


def main_transcript(workspace: Path) -> Path | None:
    """The largest top-level session transcript (subagent transcripts sit deeper)."""
    found = sorted(
        (workspace / "home" / ".claude" / "projects").glob("*/*.jsonl"),
        key=lambda p: (p.stat().st_size, p.name),
        reverse=True,
    )
    return found[0] if found else None


def void_kind(verdict: Mapping[str, Any]) -> str | None:
    """Name a void attempt, failing closed: any outcome but pass or fail is void."""
    if verdict.get("final") in ("pass", "fail"):
        return None
    reason = str(verdict.get("final_reason") or "")
    gauntlet = verdict.get("gauntlet") or {}
    if not gauntlet and "quorum error (setup)" in reason:
        return "void-setup"
    # Quorum synthesizes the gauntlet record with run_id None when the
    # Gauntlet-Agent exits without a result; a written result carries its run
    # id and stays a capped void whatever its text says (Correction 3).
    if (
        gauntlet.get("status") == "investigate"
        and gauntlet.get("run_id") is None
        and "without writing a result" in str(gauntlet.get("summary") or "")
    ):
        # The Gauntlet-Agent died before grading. When its recorded stderr names
        # a transport error the host lost its network and no behavior was
        # observed to completion, so the attempt is outside the cap (plan
        # deviation 10); any other grader exit stays a capped void.
        if any(code in str(gauntlet.get("reasoning") or "") for code in TRANSPORT_ERRORS):
            return "void-transport"
        return "void-grader"
    return "void-other"


def read_adjudications(path: Path) -> dict[tuple[str, str], str]:
    """Read ``run_id<TAB>at<TAB>label<TAB>note`` rows; ``#`` lines are comments."""
    out: dict[tuple[str, str], str] = {}
    if not path.is_file():
        return out
    for line in path.read_text().splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        fields = line.split("\t")
        if len(fields) >= 3 and fields[2] in ("neither", "question", "blocked"):
            out[(fields[0], fields[1])] = fields[2]
    return out


def ledger_tasks(workspace: Path) -> set[int]:
    """Task numbers the run's SDD ledger records as complete."""
    done: set[int] = set()
    for path in (workspace / "home" / ".cache" / "hyperpowers" / "sdd").glob("**/progress.md"):
        try:
            done |= {int(n) for n in TASK_LINE.findall(path.read_text(errors="replace"))}
        except OSError:
            continue
    return done


def _strings(value: Any) -> Iterator[str]:
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from _strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from _strings(item)


def normalize(text: str) -> str:
    for old, new in UNICODE_QUOTES.items():
        text = text.replace(old, new)
    return " ".join(text.lower().split()).strip(" .")


def stop_lines(record: Path) -> list[tuple[str, str]]:
    """The Gauntlet-Agent's ``STOP: "<quote>" | <label>`` lines, normalized."""
    texts: list[str] = []
    results = record / "gauntlet-agent" / "results"
    for path in sorted(results.glob("*/result.json")):
        try:
            texts.extend(_strings(json.loads(path.read_text())))
        except (OSError, ValueError):
            continue
    for path in sorted(results.glob("*/result.md")):
        try:
            texts.append(path.read_text(errors="replace"))
        except OSError:
            continue
    found: list[tuple[str, str]] = []
    for text in texts:
        for match in STOP_LINE.finditer(text):
            item = (normalize(match.group("quote")), match.group("label").lower())
            if item[0] and item not in found:
                found.append(item)
    return found


def _label(text: str, stops: Sequence[tuple[str, str]]) -> str | None:
    norm = normalize(text)
    for quote, label in stops:
        if quote in norm:
            return label
    return None


def _check_passed(verdict: Mapping[str, Any], needle: str, phase: str = "post") -> bool | None:
    for check in verdict.get("checks") or []:
        if not isinstance(check, dict):
            continue
        if check.get("check") != "command-succeeds" or check.get("phase") != phase:
            continue
        if any(needle in str(arg) for arg in check.get("args") or []):
            return bool(check.get("passed"))
    return None


def _strip_heredocs(command: str) -> str:
    return HEREDOC.sub(lambda m: m.group(0).split("\n", 1)[0], command)


def _segments(command: str, pipes: bool = True) -> list[str]:
    """Split a command at ``;``, ``&&``, ``||`` and newlines outside quotes, and at ``|`` when ``pipes``.

    Comments are dropped, and a backslash keeps the next character (a quote or
    a newline) inside the current segment.
    """
    out: list[str] = []
    current: list[str] = []
    quote = ""
    i = 0
    while i < len(command):
        ch = command[i]
        if quote:
            if ch == "\\" and quote == '"':
                current.append(command[i : i + 2])
                i += 2
                continue
            if ch == quote:
                quote = ""
        elif ch == "\\":
            current.append(command[i : i + 2])
            i += 2
            continue
        elif ch in "'\"":
            quote = ch
        elif ch == "#" and (i == 0 or command[i - 1] in " \t\n;&|("):
            end = command.find("\n", i)
            i = len(command) if end < 0 else end
            continue
        elif ch in ";\n" or command.startswith(("&&", "||"), i) or (pipes and ch == "|"):
            out.append("".join(current))
            current = []
            i += 2 if command.startswith(("&&", "||"), i) else 1
            continue
        current.append(ch)
        i += 1
    out.append("".join(current))
    return out


def _heredoc_command(command: str, match: re.Match[str]) -> str:
    """The pipeline a heredoc feeds: its line on both sides of the ``<<``, cut at ``;``, ``&&`` and ``||``."""
    start = command.rfind("\n", 0, match.start()) + 1
    before = _segments(command[start : match.start()], pipes=False)[-1]
    after = _segments(match.group(0).split("\n", 1)[0], pipes=False)[0]
    return before + after


def _assignments(command: str) -> dict[str, str]:
    """The ``NAME=value`` assignments a command makes, each value expanded with the ones before it."""
    env: dict[str, str] = {}
    for match in ASSIGN.finditer(_strip_heredocs(command)):
        value = next((g for g in match.group(2, 3, 4) if g is not None), "")
        env[match.group(1)] = _expand(value, env)
    return env


def _expand(text: str, env: Mapping[str, str]) -> str:
    return VAR_REF.sub(lambda m: env.get(m.group(1) or m.group(2), m.group(0)), text)


def shell_detaches(text: str) -> bool:
    """The untracked-launch tripwire over one command or one script body (Design §2 U)."""
    unheredoc = _strip_heredocs(text)
    if PY_DETACH.search(unheredoc):
        return True
    body = QUOTED.sub("''", unheredoc)
    if CMD_DETACH.search(body):
        return True
    return "&" in SAFE_AMP.sub("", body)


def runs_soak(command: str, name: str) -> bool:
    """Whether a command runs the named soak test, directly or through ``unittest discover``.

    Only a ``python3 -m unittest`` invocation at the start of a shell command
    counts, so a grep, echo or commit message that mentions the covering
    command does not.
    """
    for match in UNITTEST_CMD.finditer(command):
        args = match.group(1)
        if re.search(rf"\b{name}\b", args):
            return True
        discover = re.match(r"\s+discover\b(.*)", args)
        if discover:
            pattern = re.search(r"-p\s+['\"]?([^\s'\"]+)", discover.group(1))
            if pattern is None or fnmatch.fnmatch(f"{name}.py", pattern.group(1)):
                return True
    return False


def _executed(path: str, commands: Sequence[str]) -> bool:
    base = re.escape(Path(path).name)
    runner = rf"(?:\b(?:bash|sh|zsh|python3?|source)\s+|(?<![\w/.])\.\s+)(?:\S*/)?{base}\b"
    direct = rf"(?:^|[;&|(]|&&)\s*(?:\./|/)(?:\S*/)?{base}\b"
    return any(re.search(runner, c) or re.search(direct, c, re.MULTILINE) for c in commands)


def _final_content(path: str, workspace: Path) -> str | None:
    marker = "coding-agent-workdir/"
    if marker in path:
        candidate = workspace / "coding-agent-workdir" / path.split(marker, 1)[1]
    elif not path.startswith("/"):
        candidate = workspace / "coding-agent-workdir" / path
    else:
        return None
    return candidate.read_text(errors="replace") if candidate.is_file() else None


def _payload(command: str) -> str:
    """The quoted text a command writes, with ``\\n`` escapes as newlines."""
    parts: list[str] = []
    for quoted in QUOTED.findall(command):
        body = quoted[1:-1]
        if quoted.startswith('"'):
            body = body.replace('\\"', '"')
        parts.append(body.replace("\\n", "\n"))
    return "\n".join(parts)


def _calls(records: Sequence[Record]) -> list[Call]:
    calls: dict[str, Call] = {}
    order: list[str] = []
    for rec in records:
        for use in tool_uses(rec):
            tool_id = use.get("id")
            if isinstance(tool_id, str):
                inp = tool_input(use)
                calls[tool_id] = Call(tool_id, parse_ts(rec["timestamp"]), str(use.get("name")), inp)
                order.append(tool_id)
        if is_tool_result(rec):
            for block in blocks(rec):
                tool_id = block.get("tool_use_id")
                if block.get("type") == "tool_result" and isinstance(tool_id, str) and tool_id in calls:
                    calls[tool_id] = replace(
                        calls[tool_id],
                        result_at=parse_ts(rec["timestamp"]),
                        result=result_text(block),
                        error=bool(block.get("is_error")),
                    )
    return [calls[t] for t in order]


def _unescape(text: str, double_quoted: bool = False) -> str:
    """The text as printf or echo -e emits it.

    An odd run of backslashes before n, r or t ends in that character; an
    even run stays literal. Bash halves backslash pairs inside double quotes
    before the command sees them.
    """
    if double_quoted:
        text = text.replace("\\\\", "\\")
    return ESCAPE.sub(lambda m: m.group(1) + ESCAPES[m.group(2)], text)


def _requote(quoted: str) -> str:
    return quoted[0] + _unescape(quoted[1:-1], quoted[0] == '"') + quoted[0]


def _interpret_escapes(segment: str) -> str:
    """The segment with the escapes the shell interprets written out.

    Three forms turn a literal ``\\n`` into a newline: a printf format string,
    the arguments of ``echo -e``, and ``$'...'`` quoting. Everywhere else (plain
    echo, a printf ``%s`` argument, a heredoc body) the two characters reach the
    ledger as they are and mark nothing. Correction 3 (Codex gate, Task 11): the
    earlier pattern credited every literal escape.
    """
    out = segment
    for match in PRINTF_FORMAT.finditer(segment):
        out = out.replace(match.group(1), _requote(match.group(1)), 1)
    echo = ECHO_E.search(out)
    if echo and "e" in echo.group(1) and "E" not in echo.group(1):
        head, tail = out[: echo.end()], out[echo.end():]
        out = head + QUOTED.sub(lambda m: _requote(m.group(0)), tail)
    return ANSI_C.sub(lambda m: "$'" + _unescape(m.group(1)) + "'", out)


def _ledger_marks(call: Call) -> set[int]:
    """Task numbers that one successful write to an SDD ledger marks complete.

    SDD's Finish deletes the plan workspace, ledger included, so a finished
    run's completion record survives only as these writes in the transcript:
    an Edit, MultiEdit or Write to an SDD ``progress.md``, or the part of a
    Bash command that writes to one through a redirect, ``tee`` or heredoc.
    """
    if call.result is None or call.error:
        return set()
    if call.name in WRITERS:
        if not _is_ledger_path(str(call.inp.get("file_path", ""))):
            return set()
        # Only the new content marks a task: an Edit's old_string repeats lines
        # already written, and JSON-encoding the input would hide a mark that
        # follows a newline from the word-boundary match.
        parts = [call.inp.get("content"), call.inp.get("new_string")]
        edits = call.inp.get("edits")
        if isinstance(edits, list):
            parts += [e.get("new_string") for e in edits if isinstance(e, dict)]
        text = "\n".join(part for part in parts if isinstance(part, str))
    elif call.name == "Bash":
        command = str(call.inp.get("command", ""))
        # Controllers name the ledger through a variable (L=<path>; cat >> "$L"),
        # put the target after the heredoc marker, or append through tee, so
        # targets are expanded and a pipeline stays whole.
        env = _assignments(command)
        written: list[str] = []
        for match in HEREDOC.finditer(command):
            if _writes_ledger(_heredoc_command(command, match), env):
                written.append(match.group(3))
        for segment in _segments(_strip_heredocs(command), pipes=False):
            if _writes_ledger(segment, env):
                written.append(_interpret_escapes(segment))
        text = "\n".join(written)
    else:
        return set()
    return {int(n) for n in MARK.findall(text)}


def _is_ledger_path(path: str) -> bool:
    return path.endswith(LEDGER_FILE) and LEDGER_DIR in path


def _writes_ledger(command: str, env: Mapping[str, str]) -> bool:
    """Whether a command writes to an SDD ledger.

    A target that still holds ``$`` after expansion was set by a command
    substitution (``W=$(cat …/sdd-dir.txt)``, a spelling real controllers
    use); it counts when it ends in ``/progress.md``, since the SDD ledger is
    the only ``progress.md`` a scenario run writes.
    """
    for match in WRITE_TARGET.finditer(command):
        path = _expand(match.group(2), env)
        if _is_ledger_path(path) or ("$" in path and path.endswith("/" + LEDGER_FILE)):
            return True
    return False


def _read_only(segment: str) -> bool:
    """Whether one shell command only reads or runs files (the soak-tamper allowlist).

    Fails closed: a command the shell lexer cannot split is not read-only.
    """
    try:
        words = shlex.split(segment.replace("\\\n", " "))
    except ValueError:
        return False
    while words and (re.match(r"^\w+=", words[0]) or words[0] in COMMAND_PREFIXES):
        if words[0] == "timeout":
            words = words[1:]
            while words and words[0].startswith("-"):
                words = words[1:]
        words = words[1:]
    if not words:
        return True
    head = words[0].rsplit("/", 1)[-1]
    rest = words[1:]
    if head in READ_ONLY:
        return True
    if head == "sed":
        return not any(SED_IN_PLACE.match(w) for w in rest)
    if head == "git":
        while rest and rest[0].startswith("-"):
            rest = rest[2:] if rest[0] in GIT_VALUE_OPTIONS else rest[1:]
        return bool(rest) and rest[0] in READ_ONLY_GIT and not any(w.startswith("--output") for w in rest)
    if head in ("python", "python3"):
        return rest[:2] in (["-m", "unittest"], ["-m", "pytest"]) or (bool(rest) and rest[0].endswith(SOAK_FILES))
    return False


def _soak_tampered(calls: Sequence[Call]) -> bool:
    """Whether a successful main-session call may have written to a soak test file (plan deviation 6).

    Fails closed: any shell command that names a soak file and is not on the
    read-only allowlist counts, as does a heredoc naming one that feeds a
    pipeline with a command off the allowlist (``python3 - <<EOF``).
    """
    for call in calls:
        if call.result is None or call.error:
            continue
        if call.name in WRITERS:
            if str(call.inp.get("file_path", "")).endswith(SOAK_FILES):
                return True
        elif call.name == "Bash":
            command = str(call.inp.get("command", ""))
            if not any(name in command for name in SOAK_FILES):
                continue
            if any(m.group(2).endswith(SOAK_FILES) for m in WRITE_TARGET.finditer(command)):
                return True
            for match in HEREDOC.finditer(command):
                if any(name in match.group(3) for name in SOAK_FILES) and not all(
                    _read_only(part) for part in _segments(_heredoc_command(command, match))
                ):
                    return True
            for segment in _segments(_strip_heredocs(command)):
                if any(name in segment for name in SOAK_FILES) and not _read_only(segment):
                    return True
    return False


def _untracked(calls: Sequence[Call], workspace: Path) -> list[dict[str, str]]:
    found: list[dict[str, str]] = []
    commands: list[tuple[int, datetime, str]] = []
    # (call index, time, path, content, the rest of the writing command after the write)
    written: list[tuple[int, datetime, str, str, str]] = []
    for index, call in enumerate(calls):
        if call.name == "Bash":
            command = str(call.inp.get("command", ""))
            commands.append((index, call.at, command))
            for match in HEREDOC.finditer(command):
                start = command.rfind("\n", 0, match.start()) + 1
                target = WRITE_TARGET.search(command[start : match.start()])
                if target:
                    written.append((index, call.at, target.group(2), match.group(3), command[match.end() :]))
            stripped = _strip_heredocs(command)
            for match in REDIRECT.finditer(stripped):
                path = match.group(2)
                if path == "/dev/null":
                    continue
                content = _final_content(path, workspace)
                body = content if content is not None else _payload(command)
                written.append((index, call.at, path, body, stripped[match.end() :]))
        elif call.name in WRITERS:
            path = str(call.inp.get("file_path", ""))
            content = _final_content(path, workspace)
            if content is None and call.name == "Write":
                content = str(call.inp.get("content", ""))
            if content is None:
                # An Edit to a file gone from the archive (a temporary script,
                # or a Zed checkout the summary cannot see): judge the new text.
                parts = [call.inp.get("new_string")]
                edits = call.inp.get("edits")
                if isinstance(edits, list):
                    parts += [e.get("new_string") for e in edits if isinstance(e, dict)]
                content = "\n".join(part for part in parts if isinstance(part, str)) or None
            if path and content is not None:
                written.append((index, call.at, path, content, ""))
    for _, when, command in commands:
        payloads = [m.group(2) for m in SH_C.finditer(command)]
        if shell_detaches(command) or any(shell_detaches(p) for p in payloads):
            found.append({"at": iso(when), "where": "command", "detail": command[:200]})
    flagged: set[str] = set()
    for index, when, path, content, rest in written:
        # A script can be written and run in one Bash call, so the rest of the
        # writing command counts as a later execution too.
        later = [rest] + [c for i, _, c in commands if i > index]
        if path not in flagged and _executed(path, later) and shell_detaches(content):
            flagged.add(path)
            found.append({"at": iso(when), "where": "file", "detail": path})
    return found


def empty_measure(run_id: str) -> dict[str, Any]:
    """Every ``measure`` key at its no-evidence value."""
    return {
        "run_id": run_id, "final": None, "void": None, "plugin_dir": None, "model": None, "cc": None,
        "models": [], "evals_commit": None, "evals_clean": None, "task_tools": False, "codex_absent": False,
        "unit_tests_passed": None, "soak_tests_passed": None, "soaks_unchanged": None, "soak_tampered": False, "plan_complete": False, "ledger_marks": [], "plan_at": None,
        "final_review": False, "success": False, "candidates": [], "premature": 0, "unadjudicated": 0,
        "censored_stops": 0, "dispatch_fg": 0, "dispatch_bg": 0, "dispatch_unclassified": 0,
        "dispatch_other": 0, "short_runs": [], "short_ok": False, "long_runs": [], "long_ok": False,
        "live_turn_ends": [], "untracked": [],
    }


def _transcript_measures(
    records: Sequence[Record],
    out: dict[str, Any],
    stops: Sequence[tuple[str, str]],
    adjudicated: Mapping[tuple[str, str], str],
    workspace: Path,
    file_tasks: set[int],
) -> None:
    calls = _calls(records)
    out["cc"] = next((r.get("version") for r in records if r.get("version")), None)
    out["task_tools"] = any(
        (r.get("attachment") or {}).get("type") == "deferred_tools_delta"
        and "TaskCreate" in ((r.get("attachment") or {}).get("addedNames") or [])
        for r in records
    ) or any(c.name in ("TaskCreate", "TaskUpdate") for c in calls)
    bash = [c for c in calls if c.name == "Bash"]
    out["companion_used"] = any("codex-companion.mjs" in str(c.inp.get("command", "")) for c in bash)

    marked: set[int] = set()
    written_at: datetime | None = None
    last_write: datetime | None = None
    for call in calls:
        tasks_marked = _ledger_marks(call)
        marked |= tasks_marked
        if tasks_marked:
            last_write = call.at
        if written_at is None and LAST_TASK in tasks_marked:
            written_at = call.at
    out["ledger_marks"] = sorted(marked)
    complete = set(range(1, LAST_TASK + 1)) <= (file_tasks | marked)
    out["plan_complete"] = complete
    reviews: list[tuple[datetime, str]] = []
    last_implementer: datetime | None = None
    for call in calls:
        if call.name not in ("Agent", "Task"):
            continue
        desc = str(call.inp.get("description", ""))
        if not SDD_ROLE.search(desc):
            out["dispatch_other"] += 1
            continue
        flag = call.inp.get("run_in_background")
        if (call.result is not None and LAUNCH_AGENT in call.result) or flag is True:
            out["dispatch_bg"] += 1
        elif flag is False and call.result is not None and not call.error:
            out["dispatch_fg"] += 1
        else:
            out["dispatch_unclassified"] += 1
        # The final review's description varies (the reviewer template says
        # "Review code changes"), so position identifies it, not wording.
        if IMPLEMENT.search(desc) and not REVIEW.search(desc):
            last_implementer = call.at
        if call.result is not None and not call.error and REVIEW.search(desc) and not FIX.search(desc):
            reviews.append((call.at, desc))
    plan_at = written_at or (last_write if complete else None)
    out["plan_at"] = iso(plan_at) if plan_at else None
    # The final review is a review dispatched once the last task is marked
    # complete, or, when the controller writes that mark only after the final
    # review returns (three of the four counted smoke runs), the last of at
    # least two review dispatches after the last implementer dispatch, when
    # that last one names no task: task reviews and re-reviews name theirs
    # ("Review Task 6 (spec + quality)", "Re-review Task 6 fix round 1"), the
    # whole-branch review does not ("Review code changes").
    after_last = [(t, d) for t, d in reviews if last_implementer is not None and t > last_implementer]
    out["final_review"] = bool(
        (plan_at is not None and any(t >= plan_at for t, _ in reviews))
        or (complete and len(after_last) >= 2 and not TASK_REF.search(after_last[-1][1]))
    )

    task_map = tasks(records)
    reload_times = reloads(records)
    ends = turn_ends(records)
    for index, call in enumerate(bash):
        command = str(call.inp.get("command", ""))
        timeout = call.inp.get("timeout")
        limit = int(timeout) if isinstance(timeout, (int, float)) else BASH_DEFAULT_TIMEOUT_MS
        background = call.result is not None and (
            LAUNCH_BASH in call.result or call.result.lstrip().startswith(LAUNCH_BASH_AUTO)
        )
        if runs_soak(command, SHORT_SOAK):
            elapsed = (call.result_at - call.at).total_seconds() if call.result_at else None
            out["short_runs"].append({"at": iso(call.at), "background": background, "timeout": limit, "elapsed": elapsed})
        if runs_soak(command, LONG_SOAK):
            target = OUT_TARGET.search(command)
            out_file = target.group(2) if target else None
            seen: Call | None = None
            # The watch must read this job's own output or exit file; any other
            # exit=0 proves nothing about the soak.
            for later in bash[index + 1 :]:
                if out_file is None or later.result is None or LAUNCH_BASH in later.result:
                    continue
                if out_file in str(later.inp.get("command", "")) and "exit=" in later.result:
                    seen = later
                    break
            end_at = seen.result_at if seen else None
            tracked = (
                call.inp.get("run_in_background") is True and call.result is not None and LAUNCH_BASH in call.result
            )
            out["long_runs"].append({
                "at": iso(call.at), "background": tracked, "timeout": limit,
                "detached": shell_detaches(command), "watched": seen is not None,
                "exit_ok": bool(seen and seen.result and EXIT_ZERO.search(seen.result)),
                "turn_end_during": end_at is None or any(call.at < e.at < end_at for e in ends),
                "elapsed": (end_at - call.at).total_seconds() if end_at else None,
            })
    out["short_ok"] = bool(out["short_runs"]) and all(
        not r["background"] and r["timeout"] >= SHORT_RUNTIME_MS
        and r["elapsed"] is not None and r["elapsed"] >= SHORT_MIN_ELAPSED_S
        for r in out["short_runs"]
    )
    out["long_ok"] = bool(out["long_runs"]) and all(
        r["background"] and r["timeout"] >= LONG_RUNTIME_MS and not r["detached"]
        and r["watched"] and r["exit_ok"] and not r["turn_end_during"]
        and r["elapsed"] is not None and r["elapsed"] >= LONG_MIN_ELAPSED_S
        for r in out["long_runs"]
    )
    out["soak_tampered"] = _soak_tampered(calls)

    for end in ends:
        if end.excluded is not None:
            continue
        state = state_at(end.at, task_map, reload_times)
        if state == "live":
            wake = min(
                task.completed for task in task_map.values()
                if task.completed is not None and task.launched <= end.at < task.completed
            )
            out["live_turn_ends"].append({"at": iso(end.at), "idle_seconds": (wake - end.at).total_seconds()})
            continue
        if plan_at is not None and end.at >= plan_at:
            continue
        if state == "censored":
            out["censored_stops"] += 1
            continue
        label = _label(end.text, stops)
        source = "verdict" if label else "none"
        if label is None:
            label = adjudicated.get((out["run_id"], iso(end.at)))
            source = "adjudication" if label else "none"
        out["candidates"].append({
            "at": iso(end.at), "label": label or "unadjudicated", "source": source,
            "heuristic": asks_or_blocks(end.text),
            "continue_reply": (end.next_human or "").strip().lower() == "continue",
            "tail": end.text[-200:],
        })
    out["premature"] = sum(1 for c in out["candidates"] if c["label"] == "neither")
    out["unadjudicated"] = sum(1 for c in out["candidates"] if c["label"] == "unadjudicated")
    out["untracked"] = _untracked(calls, workspace)


def measure(record: Path, adjudicated: Mapping[tuple[str, str], str]) -> dict[str, Any]:
    """Every Design §2 measure and the provenance readouts for one run."""
    out = empty_measure(record.name)
    verdict = json.loads((record / "verdict.json").read_text())
    workspace = workspace_of(record)
    launch = record / "gauntlet-agent" / "context" / "launch-agent"
    launch_text = launch.read_text() if launch.is_file() else ""
    plugin = PLUGIN_DIR.search(launch_text)
    model = MODEL.search(launch_text)
    provenance = verdict.get("provenance") or {}
    economics = (verdict.get("economics") or {}).get("coding_agent") or {}
    out.update({
        "final": verdict.get("final"),
        "void": void_kind(verdict),
        "plugin_dir": plugin.group(1) if plugin else None,
        "model": model.group(1) if model else None,
        "evals_commit": provenance.get("evals_commit"),
        "evals_clean": provenance.get("evals_clean"),
        "models": sorted({str(m.get("model")) for m in economics.get("models") or [] if isinstance(m, dict) and m.get("model")}),
        "unit_tests_passed": _check_passed(verdict, UNIT_TESTS),
        "soak_tests_passed": _check_passed(verdict, SOAK_SHORT_CHECK) is True
        and _check_passed(verdict, SOAK_LONG_CHECK) is True,
        "soaks_unchanged": _check_passed(verdict, SOAKS_UNCHANGED),
    })
    file_tasks = ledger_tasks(workspace)
    out["plan_complete"] = set(range(1, LAST_TASK + 1)) <= file_tasks
    transcript = main_transcript(workspace)
    if transcript is not None:
        _transcript_measures(load(transcript), out, stop_lines(record), adjudicated, workspace, file_tasks)
    companion_used = out.pop("companion_used", False)
    out["codex_absent"] = (
        _check_passed(verdict, CODEX_PRECHECK, "pre") is True
        and _check_passed(verdict, CODEX_CACHE_CHECK, "pre") is True
        and not companion_used
    )
    out["success"] = bool(
        out["plan_complete"]
        and out["final_review"]
        and out["unit_tests_passed"] is True
        and out["soak_tests_passed"]
        and out["soaks_unchanged"] is True
        and not out["soak_tampered"]
    )
    return out


def transcript_summary(path: Path) -> dict[str, Any]:
    """The stops, waits and dispatch mode of one transcript, for the Zed checks (Task 14)."""
    out = empty_measure(path.stem)
    _transcript_measures(load(path), out, [], {}, path.parent, set())
    plan_at = out["plan_at"]
    return {
        "dispatch_fg": out["dispatch_fg"],
        "dispatch_bg": out["dispatch_bg"],
        "dispatch_unclassified": out["dispatch_unclassified"],
        "plan_at": plan_at,
        "stops_before_completion": [{"at": c["at"], "heuristic": c["heuristic"]} for c in out["candidates"]],
        "live_turn_ends_before_completion": sum(1 for e in out["live_turn_ends"] if plan_at is None or e["at"] < plan_at),
        "censored_stops": out["censored_stops"],
        "untracked": len(out["untracked"]),
    }


def main(argv: Sequence[str] | None = None) -> int:
    """Print ``measure`` for each record directory and ``transcript_summary`` for each transcript."""
    parser = argparse.ArgumentParser(description="Per-run measures for the sdd-turn-liveness scenario.")
    parser.add_argument("records", nargs="*", type=Path)
    parser.add_argument("--adjudications", type=Path, default=HERE / "adjudications.tsv")
    parser.add_argument("--transcript", type=Path, action="append", default=[])
    args = parser.parse_args(argv)
    adjudicated = read_adjudications(args.adjudications)
    for record in args.records:
        print(json.dumps(measure(record, adjudicated), indent=1, sort_keys=True))
    for path in args.transcript:
        print(json.dumps(transcript_summary(path), indent=1, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
