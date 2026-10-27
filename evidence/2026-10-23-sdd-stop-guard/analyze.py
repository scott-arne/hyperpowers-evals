"""Per-run measures for the sdd-stop-guard scenario (spec Design §4).

A run is a quorum record directory, ``<root>/<run>/`` holding
``verdict.json``, beside its workspace ``<root>/workspaces/<run>/`` (the
relocated layout that ``results/`` and an evidence archive share; a record
without a workspace sibling is read as its own workspace). ``measure`` reads
the verdict, the launch command, the main transcript and the Gauntlet-Agent's
result, and returns every measure the decision rule uses plus the provenance
fields the tally checks against the campaign pin. It decides nothing.

The readers in the middle of this module find what one run of the stop guard
left behind: the session id its transcript is named after, the Finish receipt
that session wrote, the live plan workspace of a run that never reached
Finish, the decision record (the plan's log and the session's mirror, as one
union), and the tracked-job records. They are what the measures are built on,
and they decide which artifacts are a run's.
"""

from __future__ import annotations

import argparse
import fnmatch
import json
import re
import shlex
import sys
from collections import Counter
from collections.abc import Iterator, Mapping, Sequence
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
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
    blocks,
    is_tool_result,
    live_kinds_at,
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
PLAN_TASKS = frozenset(range(1, LAST_TASK + 1))
LEDGER_FILE = "progress.md"
RECEIPTS_DIR = "hyperpowers/receipts"
MIRROR_DIR = "hyperpowers/stop-guard"
PLAN_LOG = "stop-guard.jsonl"
# The ledger's identity line (sdd-state's IDENTITY_PREFIX) and the completion
# line `sdd-state complete` appends, which carries its commit range after the
# word and may be preceded by a list marker.
LEDGER_HEAD = re.compile(r"^# SDD ledger — plan: (.+)$", re.MULTILINE)
COMPLETE_LINE = re.compile(r"(?:^|[^A-Za-z0-9])Task (\d+): complete")
# A receipt directory is `<workspace name>-<UTC stamp>` with, when a finish of
# the same second took that name, a numeric suffix the later finish falls to.
RECEIPT_STAMP = re.compile(r"(\d{8}T\d{6}Z)(?:-(\d+))?$")
# `publish_receipt` falls from the plain name to `-2`, `-3` and so on; any other
# trailing number is a staging's pid, not a retry.
RETRY_SUFFIXES = range(2, 11)
# sdd-state's import copies, which keep a plan workspace's name (the hook's
# LIFECYCLE_COPY).
LIFECYCLE_COPY = re.compile(r"\.import(ing)?-[0-9]+$")
FRAGMENT = "\t#fragment"
DECISIONS = ("allow", "block")
ADJUDICATION_LABELS = ("handback", "neither")
HANDBACK_REASONS = ("handback-text", "handback-line")
# The allow-to-stop window, [stop - SKEW, stop + MINUTE]: SKEW covers the clock
# difference between the transcript's timestamps and the hook's own.
MINUTE = timedelta(minutes=1)
SKEW = timedelta(seconds=2)
SHORT_SOAK = "test_soak_short"
LONG_SOAK = "test_soak_long"
SHORT_RUNTIME_MS = 240_000
SHORT_MIN_ELAPSED_S = 200
LONG_MIN_ELAPSED_S = 600
TRACKED_JOB = "tracked-job"
WAIT_SHELLS = frozenset({"bash", "sh"})
# The shells a job record's argv can name, which run the operand after `-c`
# and take the words beyond it as `$0` and its arguments.
SHELL_RUNNERS = frozenset({"bash", "sh", "zsh"})
# The shell options whose value is the next word, which the scan for the
# `-c` operand has to step over rather than read as an option of its own.
SHELL_VALUE_OPTIONS = frozenset({"-o", "+o", "-O", "+O", "--rcfile", "--init-file"})
# The interpreters that run a test module with `-m unittest`; no other head
# executes the soak, whatever its arguments quote.
PYTHON_RUNNERS = frozenset({"python", "python3"})
# The operators under which a command exiting 0 proves the segment after
# them ran: nothing (one command), `;` (which `_split_ops` also reports for
# a newline) and `&&`. After `||` the segment runs only when its left side
# failed, and a pipeline's exit status is its last command's, so neither
# shape lets an exit 0 say the segment executed.
PROVEN_OPS = frozenset({"", ";", "&&"})
# How many nested `sh -c` wrappers a command is read through before it is
# treated as unproven. Real launches nest one or two deep; a stack past the
# bound is not worth trusting.
SHELL_NESTING = 4
# `tracked-job wait` prints its verdict last on stdout, after any note it
# makes, so the verdict is the result's last non-blank line and nowhere else.
WAIT_EXITED = re.compile(r"^status=exited code=0\r?$")
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
READ_ONLY = frozenset({
    "cat", "head", "tail", "grep", "egrep", "fgrep", "rg", "less", "more", "wc", "diff", "cmp",
    "ls", "stat", "file", "sha256sum", "shasum", "md5", "md5sum", "test", "[", "pytest",
    "echo", "printf", "nl", "cut", "true",
})
READ_ONLY_GIT = frozenset({"diff", "show", "log", "status", "blame", "ls-files", "grep", "cat-file"})
GIT_VALUE_OPTIONS = ("-C", "-c", "--git-dir", "--work-tree")
COMMAND_PREFIXES = frozenset({"env", "nohup", "time", "timeout"})
SED_IN_PLACE = re.compile(r"-[A-Za-z]*i|--in-place")
STOPS_WORD = re.compile(r"\bstops?\b")
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
SH_C = re.compile(r"\b(?:bash|sh|zsh)\s+-c\s+(['\"])(.*?)(?<!\\)\1", re.DOTALL)
UNICODE_QUOTES = {"\u2018": "'", "\u2019": "'", "\u201c": "'", "\u201d": "'", '"': "'"}


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
    """Read ``run_id<TAB>key<TAB>label<TAB>note`` rows; ``#`` lines are comments.

    The labels are this campaign's: a decision the human partner read as a
    genuine hand-back is ``handback``, one that was neither a question nor a
    BLOCKED report is ``neither`` (H2 and H3). The previous campaign's
    ``question`` and ``blocked`` are not labels here: they are what the
    Gauntlet's own STOP list says, which ``stop_lines`` reads.
    """
    out: dict[tuple[str, str], str] = {}
    if not path.is_file():
        return out
    for line in path.read_text().splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        fields = line.split("\t")
        if len(fields) >= 3 and fields[2] in ADJUDICATION_LABELS:
            out[(fields[0], fields[1])] = fields[2]
    return out


class ArtifactError(Exception):
    """An archived run whose artifacts contradict each other."""


def session_id(transcript: Path) -> str:
    """The session id a transcript is named after.

    Claude Code names a transcript after its session id, one token of
    ``[A-Za-z0-9._-]``, so the stem is the id the hook's discovery matched
    (``session <sid>:`` in a ledger).
    """
    return transcript.stem


def _read(path: Path) -> str:
    """One artifact's text, as the bytes its writers wrote it.

    ``newline=""`` keeps Python's universal-newline translation out of the
    read: a carriage return inside a ledger line is an ordinary character to
    node and to the shell, and translating it to a newline would split one
    record into two and let a line claim a session it never names.
    """
    with path.open("r", errors="replace", newline="") as fh:
        return fh.read()


def ledger_records(text: str) -> list[str]:
    """The lines of a ledger or a decision log that are records.

    An append that failed part-way leaves an unterminated last line, and the
    next append fences it with a tab and ``#fragment``. Neither is a record,
    even when its prefix reads like one: ``hp_ledger_append`` writes the marker
    and both writers read their own files this way, so a reader that counted
    the remains would credit a completion line no writer counts.
    """
    lines = text.split("\n")
    # The last element is the empty tail of a terminated file, or the write that
    # never terminated. Splitting on the newline byte alone is the parity that
    # matters: ``str.splitlines`` would also break on a carriage return or a
    # Unicode separator and make two records of one line the writers see whole.
    lines.pop()
    return [line for line in lines if not line.endswith(FRAGMENT)]


def _carries(ledger: Path, sid: str) -> bool:
    """Whether a ledger holds the session's own line, the hook's discovery test."""
    try:
        text = _read(ledger)
    except OSError:
        return False
    return any(line.startswith(f"session {sid}:") for line in ledger_records(text))


def _is_plan_workspace(d: Path) -> bool:
    """A plan workspace, not one of sdd-state's copies of one.

    Finish's tomb ``plans/.removing-<ws>-<pid>`` and import's
    ``plans/<ws>.import-<pid>`` staging and ``plans/<ws>.importing-<pid>``
    backup each hold a whole ledger, this session's line included. The hook
    skips them by these same two rules, so a run archived while one of them
    was on disk must not read as two workspaces for one session.
    """
    return not d.name.startswith(".") and not LIFECYCLE_COPY.search(d.name)


def _is_receipt(d: Path) -> bool:
    """A receipt directory: not dot-prefixed, or a staging that finish marked FINISHED."""
    return not d.name.startswith(".") or (d / "FINISHED").is_file()


def _stamp(name: str) -> tuple[str, int, str]:
    """A receipt's ordering key: its UTC stamp, then the suffix a same-second finish fell to.

    Finish names a receipt ``<workspace>-<UTC stamp>`` and, when another finish
    of that same second holds the name, retries with ``-2`` through ``-9``; the
    suffixed one is therefore the later. A trailing number outside that range is
    a staging's own pid (``.staging-<ws>-<stamp>-$$``, taken when two finishes
    collide in one second), which says nothing about order and must not outrank
    a real retry. A name with no stamp sorts below every stamped one rather than
    winning on its spelling, and the name breaks a remaining tie so the answer
    is stable: a published receipt beats a staging of the same second.
    """
    m = RECEIPT_STAMP.search(name)
    if m is None:
        return ("", 0, name)
    suffix = int(m.group(2)) if m.group(2) else 0
    return (m.group(1), suffix if suffix in RETRY_SUFFIXES else 0, name)


def receipt_for(workspace: Path, sid: str) -> Path | None:
    """The newest receipt (by the UTC stamp its name ends in) whose ledger carries the session.

    :param workspace: the run's ``workspaces/<run>/`` copy.
    :param sid: the run's session id.
    :returns: the receipt directory, or None for a run that never reached Finish.
    """
    root = workspace / "home" / ".cache" / RECEIPTS_DIR
    hits = [p.parent for p in root.glob("*/progress.md") if _is_receipt(p.parent) and _carries(p, sid)]
    return max(hits, key=lambda p: _stamp(p.name)) if hits else None


def live_workspace_for(workspace: Path, sid: str) -> Path | None:
    """The one live plan workspace whose ledger carries the session.

    The glob covers both backends: a plan workspace is ``state/<key>/plans/<ws>``
    under the branch backend and ``sdd/<key>/plans/<ws>`` under the plain one.

    :param workspace: the run's ``workspaces/<run>/`` copy.
    :param sid: the run's session id.
    :returns: the workspace directory, or None once Finish has removed it.
    :raises ArtifactError: two workspaces carry the session, which leaves no
        answer to whose log and job records are the run's.
    """
    # sdd-state's import leaves the plain-cache path a symlink to the state
    # path, so one workspace is reachable twice. The hook settles that by the
    # resolved path, which is not enough over an archive: ``cp -Rp`` keeps the
    # absolute link while copying its target in, so the alias still resolves to
    # the source run where the copy resolves inside the archive. An alias is
    # therefore never counted beside a physical workspace, and answers only when
    # the archive kept no physical one.
    physical: dict[Path, Path] = {}
    aliases: dict[Path, Path] = {}
    for p in sorted(workspace.glob("home/.cache/hyperpowers/*/*/plans/*/progress.md")):
        if not _is_plan_workspace(p.parent) or not _carries(p, sid):
            continue
        found = aliases if p.parent.is_symlink() else physical
        found.setdefault(p.resolve(), p.parent)
    hits = list(physical.values()) or list(aliases.values())
    if len(hits) > 1:
        raise ArtifactError(f"{len(hits)} live workspaces carry session {sid}")
    return hits[0] if hits else None


def ledger_text_for(receipt: Path | None, live: Path | None) -> str:
    """The run's ledger: the receipt's copy, else the live workspace's, else empty."""
    for root in (receipt, live):
        if root is not None and (root / LEDGER_FILE).is_file():
            return _read(root / LEDGER_FILE)
    return ""


def plan_path_from(text: str) -> str | None:
    """The plan a ledger's identity line names."""
    m = LEDGER_HEAD.search("\n".join(ledger_records(text)))
    return m.group(1).strip() if m else None


def ledger_tasks_from(text: str) -> set[int]:
    """The task numbers a ledger records as complete, from ``sdd-state complete``'s lines."""
    return {int(m.group(1)) for m in COMPLETE_LINE.finditer("\n".join(ledger_records(text)))}


def _decision(value: Any, sid: str) -> dict[str, Any] | None:
    """One session's decision line, or None when the line is not one.

    Two writers append to these logs, so every field a reader depends on is
    checked before it is used: a glued or half-written line is an accepted
    residual, counted by its absence rather than treated as corruption. An
    offset-less timestamp is rejected with the rest, because comparing it with
    an aware one raises. ``field_hook._decision_time`` is the same rule over
    the field's mirrors; the two evidence directories stay independent, so the
    rule is mirrored here rather than imported.
    """
    if not isinstance(value, dict) or value.get("session") != sid:
        return None
    if value.get("decision") not in DECISIONS or not isinstance(value.get("ts"), str):
        return None
    try:
        when = parse_ts(value["ts"])
    except (TypeError, ValueError):
        return None
    return value if when.utcoffset() is not None else None


def _lines(path: Path, sid: str) -> list[dict[str, Any]]:
    """One decision log's well-formed lines for the session, in file order."""
    out: list[dict[str, Any]] = []
    if not path.is_file():
        return out
    # The hook reads its own logs through the ledger's rule, so a torn append
    # here is dropped rather than parsed (``tailLines`` in the hook module).
    for raw in ledger_records(_read(path)):
        try:
            d = json.loads(raw)
        except ValueError:
            continue
        line = _decision(d, sid)
        if line is not None:
            out.append(line)
    return out


def _key(d: Mapping[str, Any]) -> tuple[str, str]:
    """The key both logs are reconciled on, as the hook's ``keyOf`` spells it."""
    return (str(d.get("ts")), str(d.get("session")))


def decisions_for(
    workspace: Path, receipt: Path | None, live: Path | None, sid: str
) -> tuple[list[dict[str, Any]], list[tuple[dict[str, Any], dict[str, Any]]]]:
    """The union of the plan log (the receipt's, else the live workspace's) and the session mirror.

    The whole union is keyed by ``(ts, session)``, the key the hook itself
    merges on and the one the pre-registration fixes: a line present in one log
    only is kept, so a mirror that lost a line and a plan log that ends at
    Finish make one record between them, and two payloads under one key are
    returned as a conflict, which the tally voids as an instrument failure. The
    bash wrapper's ``hook-error`` lines are mirror-only and carry whole-second
    timestamps, so two of them in one second meet as one key: identical, they
    are one decision; different, they void the run. That is a recorded residual
    of the design, not a case to work around here.

    :param workspace: the run's ``workspaces/<run>/`` copy, which holds the mirror.
    :param receipt: the run's receipt, when Finish wrote one.
    :param live: the run's live workspace, for a run that never reached Finish.
    :param sid: the run's session id.
    :returns: the decisions in timestamp order, and the conflicting pairs.
    """
    plan_root = receipt if receipt is not None else live
    sources = ([plan_root / PLAN_LOG] if plan_root is not None else []) + [
        workspace / "home" / ".cache" / MIRROR_DIR / f"{sid}.jsonl"
    ]
    seen: dict[tuple[str, str], dict[str, Any]] = {}
    conflicts: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for path in sources:
        for d in _lines(path, sid):
            prior = seen.get(_key(d))
            if prior is None:
                seen[_key(d)] = d
            elif prior != d:
                conflicts.append((prior, d))
    # Stable, so two decisions of one second keep the order their log gave them.
    return sorted(seen.values(), key=lambda d: str(d.get("ts"))), conflicts


def jobs_for(receipt: Path | None, live: Path | None) -> list[dict[str, Any]]:
    """Every tracked-job record of the run, each with the ``_dir`` it was read from.

    The receipt's copy wins: it is the record of the run's own jobs, where a
    live workspace found beside it may be a later plan's.
    """
    root = receipt if receipt is not None else live
    out: list[dict[str, Any]] = []
    if root is None:
        return out
    for meta in sorted(root.glob("jobs/*/meta.json")):
        try:
            m = json.loads(_read(meta))
        except (OSError, ValueError):
            continue
        if not isinstance(m, dict):
            continue
        m["_dir"] = str(meta.parent)
        out.append(m)
    return out


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


def _is_stops_criterion(name: str) -> bool:
    """Whether a result's criterion is the story's "Mid-plan stops are listed".

    The grader paraphrases it: the previous campaign's archived runs spell it
    "Mid-plan stops listed", "Mid-plan stops are listed" and "List of mid-plan
    stops". The test is on the words rather than the sentence — it names stops,
    and either the plan phase or the listing — because the entries must come
    from the criterion that holds the list and from nowhere else.
    """
    low = name.lower()
    return bool(STOPS_WORD.search(low)) and ("mid-plan" in low or "list" in low)


def _stop_occurrences(text: str) -> list[tuple[str, str]]:
    """Every ``STOP:`` entry one text lists, normalized, in the order it lists them."""
    found = [
        (normalize(m.group("quote")), m.group("label").lower()) for m in STOP_LINE.finditer(text)
    ]
    return [item for item in found if item[0]]


def _parsed_result(run: Path) -> dict[str, Any] | None:
    """One grading's ``result.json`` as an object, or None when it is not one.

    :param run: a ``gauntlet-agent/results/<runId>/`` directory.
    :returns: the parsed object, or None when the file is absent, unreadable,
        malformed, or holds anything but a JSON object.
    """
    try:
        data = json.loads((run / "result.json").read_text())
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def _grading(record: Path) -> Path | None:
    """The one results directory quorum graded, chosen the way quorum chose it.

    ``verdict.json``'s ``gauntlet.run_id`` is the name of the directory quorum
    composed its verdict from, so it settles the choice whenever the verdict
    carries it. Without it this mirrors ``gauntletLayerFromRunDir``
    (``src/runner/index.ts``): newest name first, skipping a directory whose
    ``result.json`` is missing or is not an object. The last resort is the
    newest directory holding any ``result.*``, so a grading that left only a
    rendering still answers.

    :param record: the archived run's record directory.
    :returns: the directory to read, or None when the run holds no grading.
    """
    results = record / "gauntlet-agent" / "results"
    try:
        verdict = json.loads((record / "verdict.json").read_text())
    except (OSError, ValueError):
        verdict = None
    gauntlet = verdict.get("gauntlet") if isinstance(verdict, dict) else None
    named = gauntlet.get("run_id") if isinstance(gauntlet, dict) else None
    dirs = sorted(p for p in results.iterdir() if p.is_dir()) if results.is_dir() else []
    # Match on the directory's own name rather than joining the recorded one,
    # so a run_id that is not a plain name cannot reach outside ``results``.
    by_name = {p.name: p for p in dirs}
    if isinstance(named, str) and named in by_name:
        return by_name[named]
    for run in reversed(dirs):
        if _parsed_result(run) is not None:
            return run
    rendered = sorted({p.parent for p in results.glob("*/result.*")})
    return rendered[-1] if rendered else None


def stop_lines(record: Path) -> list[tuple[str, str]]:
    """The Gauntlet-Agent's ``STOP: "<quote>" | <label>`` entries, normalized, in order.

    Exactly one grading answers. Quorum composes its verdict from a single
    results directory and records that directory's name as
    ``gauntlet.run_id``, so a stale or retried grading beside it graded
    nothing and its entries are not stops the run made; ``_grading`` picks the
    same directory quorum did.

    Within that directory the entries come from the one criterion of
    ``result.json`` that holds the list. The grader's own prose quotes the
    form it was asked for ("I looked for lines such as STOP: ...") and a
    summary may repeat an entry, so reading the whole result would list stops
    the run never made. ``result.md`` is the same grading rendered for a
    reader, and answers only when the structured result is not there.

    Inside the list every entry counts: the Gauntlet writes one per stop, so two
    stops quoting one sentence are two entries, each owed its own allow.
    Collapsing them would hide the second's missing decision from the one-to-one
    match ``stop_times`` makes.

    :param record: the archived run's record directory.
    :returns: each listed stop as a normalized ``(quote, label)`` pair.
    """
    run = _grading(record)
    if run is None:
        return []
    listed: list[tuple[str, str]] | None = None
    verdict = _parsed_result(run)
    for c in (verdict or {}).get("criteria") or []:
        if isinstance(c, dict) and _is_stops_criterion(str(c.get("criterion") or "")):
            listed = (listed or []) + _stop_occurrences(str(c.get("evidence") or ""))
    markdown = run / "result.md"
    if listed is None and markdown.is_file():
        try:
            listed = _stop_occurrences(markdown.read_text(errors="replace"))
        except OSError:
            listed = None
    return listed or []


def stop_times(
    stops: Sequence[tuple[str, str]], records: Sequence[Record]
) -> list[tuple[str, str, datetime | None]]:
    """Each listed stop's time: the first turn end after the previous match whose text contains the quote.

    The Gauntlet lists its stops in order, so matching is one-to-one and
    chronological; a quote found in no turn end is timed ``None``, which the
    tally treats as an instrument failure.

    :param stops: the Gauntlet's listed stops, as ``stop_lines`` returns them.
    :param records: the main transcript.
    :returns: each stop with the time of the turn end it was quoted from.
    """
    ends = turn_ends(records)
    out: list[tuple[str, str, datetime | None]] = []
    start = 0
    for quote, label in stops:
        needle = normalize(quote)
        hit = next((i for i in range(start, len(ends)) if needle and needle in normalize(ends[i].text)), None)
        if hit is None:
            out.append((quote, label, None))
        else:
            out.append((quote, label, ends[hit].at))
            start = hit + 1
    return out


ListedStop = tuple[str, str, datetime | None]
TimedStop = tuple[str, str, datetime]


def match_allows(
    stops: Sequence[ListedStop], decisions: Sequence[Mapping[str, Any]]
) -> tuple[list[tuple[str, str, datetime, Mapping[str, Any]]], list[ListedStop]]:
    """Pair every timed stop, in time order, with the nearest unused allow in its window.

    The Stop hook runs after the assistant message the Gauntlet quotes, so a
    genuine decision lies in ``[stop - 2 s, stop + 1 min]``; an allow before
    that window belongs to an earlier stop and never satisfies a later one.
    The pairing is one-to-one: an allow answers at most one stop, and each
    stop, taken in time order, claims the unused allow nearest to it. The tie
    the window leaves open — two unused allows equally far from one stop —
    goes to the earlier allow, so the answer does not depend on log order.

    :param stops: the Gauntlet's listed stops with their times, as
        ``stop_times`` returns them.
    :param decisions: the run's decision record.
    :returns: the matched stops with the allow each took, and the stops left
        without one (an untimed stop among them, which has no window at all).
    """
    allows = sorted((d for d in decisions if d.get("decision") == "allow"), key=lambda d: str(d.get("ts")))
    allowed_at = [parse_ts(str(d.get("ts"))) for d in allows]
    used: set[int] = set()
    matched: list[tuple[str, str, datetime, Mapping[str, Any]]] = []
    unmatched: list[ListedStop] = []
    timed: list[TimedStop] = sorted(
        ((quote, label, when) for quote, label, when in stops if when is not None), key=lambda s: s[2]
    )
    for quote, label, when in timed:
        # The index breaks a tie, and the allows are in timestamp order, so two
        # allows equally far from one stop leave the earlier one the match.
        candidates = [
            (abs(at - when), i)
            for i, at in enumerate(allowed_at)
            if i not in used and -SKEW <= at - when <= MINUTE
        ]
        if not candidates:
            unmatched.append((quote, label, when))
            continue
        _, hit = min(candidates)
        used.add(hit)
        matched.append((quote, label, when, allows[hit]))
    unmatched.extend(s for s in stops if s[2] is None)
    return matched, unmatched


def live_shell_turn_ends(records: Sequence[Record]) -> list[str]:
    """Turn ends at which the only tracked work still running is a shell (Design §4 H4).

    A launch that never recorded a completion counts here, where ``state_at``
    calls it ``censored`` and the premature-stop measures drop it. The two
    answer different questions. ``state_at`` is cautious because a task whose
    liveness is unknown must not be counted as the session waiting on it. H4
    measures the Stop hook's own rule — the hook reads a launch the turn made
    with no completion notice as live and refuses the stop — and a shell the
    session walked away from without ever seeing it finish is exactly the
    failure H4 is there to catch, not a case to be cautious about.
    """
    task_map = tasks(records)
    reload_times = reloads(records)
    return [
        iso(end.at)
        for end in turn_ends(records)
        if end.excluded is None and live_kinds_at(end.at, task_map, reload_times) == {"shell"}
    ]


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


def _split_ops(command: str, pipes: bool = True) -> list[tuple[str, str]]:
    """Split a command at ``;``, ``&&``, ``||`` and newlines outside quotes, and at ``|`` when ``pipes``.

    Each segment comes with the operator that introduced it: ``""`` for the
    first, ``;`` for a semicolon or a newline, ``&&``, ``||``, or ``|``.
    Comments are dropped, and a backslash keeps the next character (a quote
    or a newline) inside the current segment.
    """
    out: list[tuple[str, str]] = []
    current: list[str] = []
    op = ""
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
            out.append((op, "".join(current)))
            current = []
            if command.startswith(("&&", "||"), i):
                op = command[i : i + 2]
                i += 2
            else:
                op = ";" if ch in ";\n" else "|"
                i += 1
            continue
        current.append(ch)
        i += 1
    out.append((op, "".join(current)))
    return out


def _segments(command: str, pipes: bool = True) -> list[str]:
    """The segments of ``_split_ops`` without their operators."""
    return [segment for _, segment in _split_ops(command, pipes)]


def _proven_final(command: str, pipes: bool = True) -> str | None:
    """The command's last non-empty segment, when exiting 0 proves it ran.

    Exit status is all a job record or a tool result carries, and it answers
    for one command: the last one the shell reached. So the final segment
    counts only when every operator joining it to what precedes it is in
    ``PROVEN_OPS``; an empty segment carries its operator forward, because
    a ``||`` at the end of a line still governs the line below it.

    A segment the shell does not wait for proves nothing either, and that
    is the untracked-launch tripwire's question (``shell_detaches``): an
    ``&`` outside quotes returns the shell to the next command immediately,
    whether it ends the segment or sits in the middle of it, and ``nohup``,
    ``setsid`` and the Python detach forms put the work beyond the shell the
    same way. The exit status then belongs to whatever ran next, and the
    command itself may still be running or already dead with its parent.
    A foreground ``nohup <command>`` is read as unproven too, a false
    negative the rule accepts: it is one character away from the shape that
    detaches and an exit 0 cannot tell them apart.

    :param command: one shell command's text.
    :param pipes: whether ``|`` separates segments as the other operators do.
    :returns: the final segment, or None when it is empty, the shell may
        have skipped it, the shell never waited for it, or the text carries
        a command substitution.
    """
    # A command substitution runs its body inside the word that carries it,
    # and `_split_ops` reads the body's `;` as a top-level operator, so a
    # fragment of the body would pose as the final command while the exit
    # belongs to the command the substitution feeds (`echo $(true; <soak>)`
    # exits 0 whatever the soak did). Nothing proves such a fragment ran, so
    # the whole text is unproven; a watch reached through `$(...)` is the
    # false negative this accepts.
    if "$(" in command or "`" in command:
        return None
    final: str | None = None
    proven = False
    joins: list[str] = []
    for op, segment in _split_ops(command, pipes):
        joins.append(op)
        if segment.strip():
            final, proven = segment, all(join in PROVEN_OPS for join in joins)
            joins = []
    if final is None or not proven or shell_detaches(final):
        return None
    return final


def _heredoc_command(command: str, match: re.Match[str]) -> str:
    """The pipeline a heredoc feeds: its line on both sides of the ``<<``, cut at ``;``, ``&&`` and ``||``."""
    start = command.rfind("\n", 0, match.start()) + 1
    before = _segments(command[start : match.start()], pipes=False)[-1]
    after = _segments(match.group(0).split("\n", 1)[0], pipes=False)[0]
    return before + after


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


def _command_words(segment: str) -> list[str] | None:
    """One shell segment's words, with its leading assignments and prefixes dropped.

    :param segment: one command, as ``_segments`` splits a Bash call's text.
    :returns: the words of the command the segment runs, or None when the
        shell lexer cannot split it (an unbalanced quote).
    """
    try:
        words = shlex.split(segment.replace("\\\n", " "))
    except ValueError:
        return None
    while words and (re.match(r"^\w+=", words[0]) or words[0] in COMMAND_PREFIXES):
        if words[0] == "timeout":
            # Drop the option's own flags and then its duration.
            words = words[1:]
            while words and words[0].startswith("-"):
                words = words[1:]
        words = words[1:]
    return words


def _read_only(segment: str) -> bool:
    """Whether one shell command only reads or runs files (the soak-tamper allowlist).

    Fails closed: a command the shell lexer cannot split is not read-only.
    """
    words = _command_words(segment)
    if words is None:
        return False
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


def _shell_operand(words: Sequence[str]) -> str | None:
    """The one command a shell invocation runs with ``-c``, or None.

    ``sh [options] -c <command> [argv0 [args...]]`` executes the single
    operand after ``-c``; the words beyond it become ``$0`` and its
    arguments, so a command parked there never runs.

    The scan walks the shell's own options, which may be introduced by ``-``
    or by ``+`` (``bash +o posix -c ...``). An option that takes a value
    carries its value in the next word, and reading that word as an option
    would end the scan at the first ``bash -o pipefail -c <command>``: the
    operand would be missed, and whatever stood in for it read as the
    command the shell ran.

    :param words: one command's words, its assignments and prefixes already
        dropped (``_command_words``), or a job record's argv.
    :returns: the operand after ``-c``, or None when the words do not run a
        shell on one.
    """
    if not words or Path(words[0]).name not in SHELL_RUNNERS:
        return None
    rest = list(words[1:])
    while rest and len(rest[0]) > 1 and rest[0][0] in "-+":
        option, rest = rest[0], rest[1:]
        if option in SHELL_VALUE_OPTIONS:
            rest = rest[1:]
            continue
        # `-c` may travel clustered with other short flags (`bash -ec ...`),
        # and whichever flag carries it, the operand is the next word.
        if not option.startswith("--") and "c" in option:
            return rest[0] if rest else None
    return None


def _proven_innermost(command: str) -> str | None:
    """The command's proven final segment, read through any nested shells.

    A proven segment that is itself ``sh -c <operand>`` exits with the
    operand's status, so it proves only what the operand proves and the
    operand is judged by the same rule. Reading the operand as one opaque
    command instead would count a soak the inner shell jumped over, because
    a ``||`` inside it looks like nothing from outside.

    :param command: one shell command's text.
    :returns: the innermost segment an exit 0 vouches for, or None when no
        segment is proven or the wrappers nest past ``SHELL_NESTING``.
    """
    final = _proven_final(command)
    for _ in range(SHELL_NESTING + 1):
        if final is None:
            return None
        words = _command_words(final)
        operand = None if words is None else _shell_operand(words)
        if operand is None:
            return final
        final = _proven_final(operand)
    return None


def _is_soak_command(segment: str, name: str) -> bool:
    """Whether one command is itself a ``python -m unittest`` run of the named soak.

    A job record carries an exit status and nothing else, so the soak counts
    only when the soak is the command that exited. That makes the head of the
    command the question: an ``echo`` quoting the covering command in an
    argument, an ``eval`` or an ``exec`` of it, or a command substitution
    carrying it (``echo $(<soak>)``, whose status is echo's) all run some
    other program over the soak's words.

    The words are re-joined before ``runs_soak`` reads them, so the pattern
    sees the invocation with its environment prefix already dropped
    (``env VAR=1 python3 -m unittest ...``) and sees an operator quoted
    inside an argument as the quoted text it is.

    :param segment: one shell command's text.
    :param name: the soak test's module name.
    :returns: whether the segment is a direct invocation of that soak.
    """
    words = _command_words(segment)
    if not words or Path(words[0]).name not in PYTHON_RUNNERS or words[1:3] != ["-m", "unittest"]:
        return False
    return runs_soak(shlex.join(words), name)


def _runs_long_soak(job: Mapping[str, Any]) -> bool:
    """Whether a job record's argv actually runs the long soak.

    The argv is read the way it is executed, not as a bag of strings, and
    only two shapes can be the soak. A shell argv0 (after its assignments
    and prefixes) runs the one operand after ``-c``; the words beyond it
    become ``$0`` and its arguments, so a soak parked there never runs, and
    a shell with no ``-c`` at all runs a script this measure cannot see
    into. Every other argv is one command, read after the argv is quoted
    back into shell form. Either way the command has to be the soak itself
    (``_is_soak_command``), because the record proves only that something
    exited 0: a job that merely carries the soak's words (``echo
    test_soak_long``, ``echo "a | <soak>"``) ran nothing.

    That exit belongs to the last command the shell reached, so only a soak
    that is that command counts (``_proven_innermost``). A soak after ``||``
    ran only if its left side failed, a piped soak's status is the
    pipeline's last command's, a soak the shell does not wait for (``<soak>
    &``, wherever the ``&`` falls) owns no exit status at all, and a soak
    with anything after it (``<soak>; true``) hands the exit to that
    command — an exit 0 cannot tell any of them from a soak that never ran.
    The last is a false negative the rule accepts for the forgeries it keeps
    out, and so is an argv the untracked-launch tripwire reads as detaching
    (``nohup bash -c <soak>``), which fails closed here as it does inside a
    command. A nested shell is read through to the command it ran, so the
    soak is looked for in that command and never in the operand carrying it.
    """
    argv = [str(part) for part in job.get("command") or []]
    if not argv:
        return False
    joined = shlex.join(argv)
    if _proven_final(joined) is None:
        # The tripwire answers for the argv as a whole, before the operand
        # hides a detaching prefix from it (`nohup bash -c <soak>`).
        return False
    words = _command_words(joined)
    if words and Path(words[0]).name in SHELL_RUNNERS:
        operand = _shell_operand(words)
        if operand is None:
            return False
        final = _proven_innermost(operand)
    else:
        final = _proven_innermost(joined)
    return final is not None and _is_soak_command(final, LONG_SOAK)


def _waited_job(command: str) -> str | None:
    """The job directory a Bash call's closing ``tracked-job wait`` names, or None.

    The helper is recognized by the word a segment actually runs, not by the
    words appearing somewhere in the text: an echo, a comment, or a commit
    message quoting the wait launches nothing and watches nothing. A segment
    the shell lexer cannot split is not a watch either.

    The wait also has to be the last thing the call runs, and the call has to
    have reached it (``_proven_final``). Setup may precede it under ``;`` or
    ``&&`` — a ``cd``, an assignment — but anything after it, a pipe included,
    can print over the helper's answer, and that answer is the whole proof: a
    call ending in ``; echo status=exited code=0`` reports a success the
    helper never gave. A wait after ``||`` ran only if its left side failed,
    which the call's exit 0 cannot show, so ``echo status=exited code=0; true
    || <wait>`` is no watch either. Nor is a wait the shell does not wait
    for: the call returns before the helper answers, so its output is not
    the verdict (``_proven_final`` again, over the same tripwire). A
    real watch in any of those shapes is read as none, a false negative the
    rule accepts to keep the forgery out, and so is a watch nested in
    another shell (``bash -c "<wait>"``), which is not recognized at all.
    """
    final = _proven_final(_strip_heredocs(command))
    if final is None:
        return None
    words = _command_words(final)
    if not words:
        return None
    if words[-1] == "&":
        # `_proven_final` already refused every `&` the shell would act on,
        # so a `&` the lexer still hands back is a quoted one: an argument
        # the helper does not take, from a call that is no watch either.
        return None
    if Path(words[0]).name in WAIT_SHELLS and len(words) > 1:
        words = words[1:]
    if Path(words[0]).name != TRACKED_JOB or words[1:2] != ["wait"]:
        return None
    # tracked-job's own argument order: `wait <jobdir> [--max-ms N]`.
    return next((w for w in words[2:] if not w.startswith("-")), None)


def _wait_verdict(result: str) -> bool:
    """Whether a call's result ends in the helper's success line.

    ``tracked-job wait`` prints ``status=<state> code=<n>`` last, after any
    note it makes, so its verdict is the last non-blank line; a success line
    anywhere above that is some other command's output.
    """
    lines = [line for line in result.split("\n") if line.strip()]
    return bool(lines) and WAIT_EXITED.match(lines[-1]) is not None


def _watched(job: Mapping[str, Any], calls: Sequence[Call]) -> bool:
    """Whether a foreground ``tracked-job wait`` watched this job to its recorded exit.

    The watch has to be a call that closed by running the helper on this job's
    own directory, in the foreground, returning without an error and ending in
    the helper's ``status=exited code=0`` verdict. It also has to be causal —
    started no earlier than the launch and answered no earlier than the job's
    end — so a watch of an earlier attempt is not read as this attempt's.
    """
    name = Path(str(job.get("_dir", ""))).name
    if not name:
        return False
    try:
        launched = parse_ts(str(job["launched"]))
        ended = parse_ts(str(job["ended"]))
    except (KeyError, ValueError):
        return False
    for call in calls:
        if call.name != "Bash" or call.inp.get("run_in_background") or call.error:
            continue
        if call.result is None or not _wait_verdict(call.result):
            continue
        if call.at < launched or call.result_at is None or call.result_at < ended:
            continue
        waited = _waited_job(str(call.inp.get("command") or ""))
        if waited is not None and Path(waited).name == name:
            return True
    return False


def long_job_of(
    jobs: Sequence[Mapping[str, Any]], calls: Sequence[Call]
) -> Mapping[str, Any] | None:
    """The long soak's job record: the attempt a foreground wait watched, else the last.

    A session that lost or failed an attempt and retried leaves several records
    of one obligation. H4 asks what the session did about the long soak, so the
    watched attempt answers it; with none watched, the last attempt is the state
    the run ended in, which is what the measure should report.
    """
    candidates = [job for job in jobs if _runs_long_soak(job)]
    watched = next((job for job in candidates if _watched(job, calls)), None)
    if watched is not None:
        return watched
    return candidates[-1] if candidates else None


def long_ok_from(job: Mapping[str, Any] | None, calls: Sequence[Call]) -> bool:
    """The long soak passed F: exited 0 after at least 600 s, and a foreground wait saw it.

    :param job: the long soak's job record, as ``long_job_of`` chose it.
    :param calls: the main session's tool calls.
    :returns: True when the record and the watch agree the job ran to its end.
    """
    if job is None or job.get("state") != "exited" or job.get("code") != 0:
        return False
    try:
        elapsed = (parse_ts(str(job["ended"])) - parse_ts(str(job["launched"]))).total_seconds()
    except (KeyError, ValueError):
        return False
    return elapsed >= LONG_MIN_ELAPSED_S and _watched(job, calls)


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
        "run_id": run_id, "final": None, "void": None, "void_detail": None, "plugin_dir": None,
        "model": None, "cc": None,
        "models": [], "evals_commit": None, "evals_clean": None, "task_tools": False, "codex_absent": False,
        "unit_tests_passed": None, "soak_tests_passed": None, "soaks_unchanged": None, "soak_tampered": False,
        "receipt": None, "plan_path": None, "plan_complete": False, "live_complete": False,
        "final_review": False, "success": False,
        "decisions": [], "decision_conflicts": 0, "plan_decisions": 0, "blocks": 0, "allows": {},
        "listed_stops": [], "neither_listed": 0, "unmatched_stops": [],
        "false_blocks": 0, "false_handbacks": 0, "unadjudicated_allows": 0, "unadjudicated_blocks": 0,
        "censored_stops": 0, "dispatch_fg": 0, "dispatch_bg": 0, "dispatch_unclassified": 0,
        "dispatch_other": 0, "short_runs": [], "short_ok": False, "long_job": None, "long_ok": False,
        "live_turn_ends": [], "live_shell_turn_ends": [], "untracked": [],
    }


def _transcript_measures(
    records: Sequence[Record],
    calls: Sequence[Call],
    out: dict[str, Any],
    workspace: Path,
    complete: bool,
) -> None:
    out["cc"] = next((r.get("version") for r in records if r.get("version")), None)
    out["task_tools"] = any(
        (r.get("attachment") or {}).get("type") == "deferred_tools_delta"
        and "TaskCreate" in ((r.get("attachment") or {}).get("addedNames") or [])
        for r in records
    ) or any(c.name in ("TaskCreate", "TaskUpdate") for c in calls)
    bash = [c for c in calls if c.name == "Bash"]
    out["companion_used"] = any("codex-companion.mjs" in str(c.inp.get("command", "")) for c in bash)

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
    # The final review is the last review dispatched after the last implementer
    # dispatch, when the plan is complete and that last review names no task:
    # task reviews and re-reviews name theirs ("Review Task 6 (spec + quality)",
    # "Re-review Task 6 fix round 1"), the whole-branch review does not ("Review
    # code changes"), so position and the missing task number identify it, not
    # wording. The plan's completion no longer has a transcript time of its own
    # (the ledger-mark reader is gone with the marks), so this is the whole rule
    # where it used to be the fallback for a late mark.
    after_last = [(t, d) for t, d in reviews if last_implementer is not None and t > last_implementer]
    out["final_review"] = bool(complete and after_last and not TASK_REF.search(after_last[-1][1]))

    task_map = tasks(records)
    reload_times = reloads(records)
    ends = turn_ends(records)
    for call in bash:
        command = str(call.inp.get("command", ""))
        timeout = call.inp.get("timeout")
        limit = int(timeout) if isinstance(timeout, (int, float)) else BASH_DEFAULT_TIMEOUT_MS
        background = call.result is not None and (
            LAUNCH_BASH in call.result or call.result.lstrip().startswith(LAUNCH_BASH_AUTO)
        )
        if runs_soak(command, SHORT_SOAK):
            elapsed = (call.result_at - call.at).total_seconds() if call.result_at else None
            out["short_runs"].append({"at": iso(call.at), "background": background, "timeout": limit, "elapsed": elapsed})
    out["short_ok"] = bool(out["short_runs"]) and all(
        not r["background"] and r["timeout"] >= SHORT_RUNTIME_MS
        and r["elapsed"] is not None and r["elapsed"] >= SHORT_MIN_ELAPSED_S
        for r in out["short_runs"]
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
        elif state == "censored":
            out["censored_stops"] += 1
    out["untracked"] = _untracked(calls, workspace)


def _decision_measures(
    out: dict[str, Any],
    record: Path,
    workspace: Path,
    receipt: Path | None,
    live: Path | None,
    sid: str | None,
    adjudicated: Mapping[tuple[str, str], str],
) -> None:
    """Tally the run's decision record: its union, its reasons, and its adjudications.

    H1 counts only the lines the hook wrote for this plan, so a ``no-ledger``
    or ``ambiguous`` line, which names no plan, is not one of them. H2 and H3
    read the labels the human partner gave each hand-back allow and each
    block, keyed by the run and the decision's timestamp.
    """
    if not sid:
        return
    decisions, conflicts = decisions_for(workspace, receipt, live, sid)
    out["decisions"] = decisions
    out["decision_conflicts"] = len(conflicts)
    plan_path = out["plan_path"]
    out["plan_decisions"] = sum(1 for d in decisions if plan_path is not None and d.get("plan") == plan_path)
    out["blocks"] = sum(1 for d in decisions if d.get("decision") == "block")
    out["allows"] = dict(Counter(str(d.get("reason")) for d in decisions if d.get("decision") == "allow"))
    for d in decisions:
        label = adjudicated.get((record.name, str(d.get("ts"))))
        if d.get("decision") == "block":
            if label == "handback":
                out["false_blocks"] += 1
            elif label is None:
                out["unadjudicated_blocks"] += 1
        elif d.get("reason") in HANDBACK_REASONS:
            if label == "neither":
                out["false_handbacks"] += 1
            elif label is None:
                out["unadjudicated_allows"] += 1


def measure(record: Path, adjudicated: Mapping[tuple[str, str], str]) -> dict[str, Any]:
    """Every Design §4 measure and the provenance readouts for one run."""
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
    transcript = main_transcript(workspace)
    records = load(transcript) if transcript is not None else []
    calls = _calls(records)
    sid = session_id(transcript) if transcript is not None else None
    receipt = receipt_for(workspace, sid) if sid else None
    live = None
    if sid:
        try:
            live = live_workspace_for(workspace, sid)
        except ArtifactError as err:
            # Two workspaces claiming one session leaves no answer to whose log
            # and job records are the run's, so the run is not measurable. A
            # verdict that already named a void keeps its kind: that kind is
            # what decides whether the attempt counts against the capped-void
            # budget, and `void-instrument` is uncapped, so relabelling a
            # capped void here would hand the campaign a free retry.
            out["void"] = out["void"] or "void-instrument"
            out["void_detail"] = str(err)
    out["receipt"] = str(receipt) if receipt is not None else None
    out["plan_path"] = plan_path_from(ledger_text_for(receipt, live))
    # The plan is unfinished until Finish removed its workspace and wrote a
    # receipt (spec Decision 5), so a complete ledger in the live workspace is
    # a diagnosis of a run that stopped short, never a completed plan.
    out["plan_complete"] = receipt is not None and PLAN_TASKS <= ledger_tasks_from(ledger_text_for(receipt, None))
    out["live_complete"] = live is not None and PLAN_TASKS <= ledger_tasks_from(ledger_text_for(None, live))
    _transcript_measures(records, calls, out, workspace, out["plan_complete"])
    _decision_measures(out, record, workspace, receipt, live, sid, adjudicated)
    listed = stop_times(stop_lines(record), records)
    out["listed_stops"] = [(quote, label, iso(when) if when else None) for quote, label, when in listed]
    out["neither_listed"] = sum(1 for _, label, _ in listed if label == "neither")
    _, unmatched = match_allows(listed, out["decisions"])
    out["unmatched_stops"] = [(quote, label, iso(when) if when else None) for quote, label, when in unmatched]
    out["live_shell_turn_ends"] = live_shell_turn_ends(records)
    long_job = long_job_of(jobs_for(receipt, live), calls)
    out["long_job"] = long_job
    out["long_ok"] = long_ok_from(long_job, calls)
    companion_used = out.pop("companion_used", False)
    out["codex_absent"] = (
        _check_passed(verdict, CODEX_PRECHECK, "pre") is True
        and _check_passed(verdict, CODEX_CACHE_CHECK, "pre") is True
        and not companion_used
    )
    out["success"] = bool(
        out["plan_complete"]
        and out["receipt"] is not None
        and out["final_review"]
        and out["unit_tests_passed"] is True
        and out["soak_tests_passed"]
        and out["soaks_unchanged"] is True
        and not out["soak_tampered"]
    )
    return out


def transcript_summary(path: Path) -> dict[str, Any]:
    """The waits and dispatch mode of one transcript, read without its run's artifacts."""
    out = empty_measure(path.stem)
    records = load(path)
    _transcript_measures(records, _calls(records), out, path.parent, False)
    return {
        "dispatch_fg": out["dispatch_fg"],
        "dispatch_bg": out["dispatch_bg"],
        "dispatch_unclassified": out["dispatch_unclassified"],
        "live_turn_ends": len(out["live_turn_ends"]),
        "censored_stops": out["censored_stops"],
        "untracked": len(out["untracked"]),
    }


def main(argv: Sequence[str] | None = None) -> int:
    """Print ``measure`` for each record directory and ``transcript_summary`` for each transcript."""
    parser = argparse.ArgumentParser(description="Per-run measures for the sdd-stop-guard scenario.")
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
