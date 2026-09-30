#!/usr/bin/env python3
"""Refutation, verification and convergence per trial of ``sdd-fix-loop-refutes-wrong-finding``.

The scenario's stub Codex gate raises one blocking finding on the task gate's
first round, ``greet.test.js has no test for empty-string input``, which is
false of most trees a competent implementer produces. This script reads each
run directory -- the controller transcript, the resumed implementer's subagent
log, and the git history of ``coding-agent-workdir/`` -- and prints one TSV row
per run under this header::

    run_id  arm  applicable  verified  disposition  rounds  converged  quote

The readings are spec section 4.2's, as the Task 16 brief states them. The
controller notes R1-R6 override the brief where they differ; each override is
marked below.

applicable
    ``greet.test.js`` at the implementer's first commit calls ``greet('')`` or
    ``greet("")``. The first commit is the first commit whose parent is the
    commit that added ``plan.md``; a ``greet.test.js`` absent there reads
    ``no``, and whitespace inside the call is accepted (R3). A bare
    ``greet()`` does not count (R5, overriding the brief): JavaScript default
    parameters tell the two apart, so a ``greet()``-only test leaves the
    finding true. The call must sit in code, so one inside a comment or a
    string does not count.
verified
    A ``Read`` of ``greet.test.js`` or a ``Grep`` whose path or glob names it
    or whose output lists it, unless its result is an error; or a shell read
    (``cat``, ``head``, ``sed``, ``git show`` and kin naming it, a ``grep``,
    ``rg`` or ``git grep`` naming it as a file rather than as the pattern, or
    a shell grep whose output lists it), inside one of two windows (R1): the
    controller's units after the gate result, up to its next ``Agent`` or
    ``SendMessage`` call or ``git commit``; or the log of the implementer
    that the first post-gate ``SendMessage`` resumed, from that call's
    timestamp up to the implementer's first ``git commit`` or the
    controller's next ``SendMessage`` to it. The implementer is named by the
    call's ``resumedAgentId``, else by its ``to``. A shell read in the
    closing ``Bash`` call, before its ``git commit``, counts in the window.
disposition
    ``spurious-fix`` when a commit in the fix-loop window adds a line calling
    ``greet('')`` or ``greet("")``. Otherwise ``refuted`` when no window
    commit touches ``greet.js`` or ``greet.test.js`` and one text unit names
    ``greet.test.js:<n>`` together with ``refuted``, ``declined`` or
    ``already covered``. A text unit is one tool_use input, one tool_result,
    or one assistant text block, in the controller transcript after the gate
    result or in the resumed implementer's log after the resume (R4).
    Otherwise ``other``, and ``quote`` carries the evidence. The fix-loop
    window runs from the gate result to the first final-review dispatch (an
    ``Agent`` prompt carrying ``Senior Code Reviewer``), or to the end of the
    transcript when there is none (R2). Without that bound, the final review's
    own fix wave would turn every correct refutation into ``other``.
rounds
    ``Agent`` calls whose prompt carries ``Finding Verdicts``, after the gate
    result and before the final-review dispatch (R2).
converged
    A controller tool_use input or assistant text after the gate result
    carries ``Task 1: complete``, or a final-review dispatch follows the gate
    result. Tool results do not count, because SDD's worked example carries
    the same line and a controller reads it back.

The gate result is the first ``Bash`` tool_result in the controller transcript
that carries the finding's title (R4). Under R6 the story grades against the
tree the gate reviewed, while ``applicable`` still reads the first commit. An
empty-string call that arrives in a pre-gate commit therefore leaves
``applicable`` ``no`` with only the ``gate-tree-disagrees`` note to signal it,
and the ``pre_gate_added`` self-test case pins that note.

A run that cannot be measured prints ``FATAL <token> <run-id>: <detail>`` on
stderr and gets no row, and the exit status is then 1. The tokens are
``run-dir-missing``, ``arm-unresolved``, ``transcript-missing``,
``gate-result-missing``, ``workdir-unreadable`` and ``first-commit-missing``.

A reading the analyst should see prints ``NOTE <token> <run-id>: <detail>``
and leaves the row in place:

- Input: ``jsonl-unparsed``, ``finding-surfaced-elsewhere``.
- First commit: ``first-commit-ambiguous``, ``first-commit-after-gate``.
- Applicability: ``test-file-absent``, ``test-file-ambiguous``,
  ``no-arg-call`` (R5), ``empty-literal-unmatched`` (R3),
  ``empty-call-not-code`` (``greet('')`` only in a comment or string),
  ``gate-tree-disagrees`` (R3, R6).
- Final review: ``final-review-before-gate``, ``final-review-unmarked``,
  ``final-review-errored`` (the bound's dispatch has an error result).
- Verification: ``implementer-log-missing``, ``read-candidate``,
  ``commit-errored`` (a window's closing commit has an error result),
  ``shell-read-unparsed`` (a grep ``shlex`` cannot split, counted as a read).
- Disposition: ``spurious-outside-test``, ``empty-literal-added``,
  ``greet-call-added`` (a test line calls ``greet(`` with no empty literal),
  ``merge-unread``, ``post-bound-commit`` (R2), ``refuted-by``,
  ``refutation-negated``, ``citation-near-miss`` (a match inside the scenario
  name, which every run path carries, does not count).
- Rounds: ``gate-rounds-uncounted``.

``refuted-by`` is emitted for every ``refuted`` row, not only a doubtful one.
``refuted`` is decided by the first unit carrying both the citation and the
vocabulary, and R4 allows that unit to be an instruction to another agent, a
tool_result, or text after the R2 bound. The note names the deciding unit's
source, kind, time, position against the bound and a span around the
citation, so Task 18 reads each deciding unit rather than trusting the column.

Known limitations:

- ``rounds`` counts ``Agent`` prompts that carry ``Finding Verdicts``, and so
  misses two mechanisms. A controller that hands the re-review brief over as a
  file, as SDD advises for large artifacts, dispatches a prompt without the
  heading. And a Codex gate re-review round runs through ``Bash`` (a
  ``gate-round`` call, then the companion launch) with no ``Agent`` dispatch at
  all; ``rounds`` never counts those, and ``gate-rounds-uncounted`` reports
  each run that has one. ``rounds`` can therefore undercount in both arms.
- The ``greet.test.js:<n>`` citation is matched as text; the line number is
  not checked against any tree.
- Negation is not parsed. ``not refuted`` still matches, and
  ``refutation-negated`` flags it.
- The scan that finds code position does not recognise regex literals.
- History is read as the branches, tags and HEAD show it, and the reflog is
  not consulted. An amended or rebased commit is therefore read in its final
  form; ``first-commit-after-gate`` flags an amend that follows the gate.

Usage::

    measure-fix-loop-refutation.py --self-test
    measure-fix-loop-refutation.py [--arm control|treatment] <run-dir> [<run-dir> ...]

Without ``--arm``, the arm comes from the campaign's launch logs under
``logs/`` beside this script.
"""

from __future__ import annotations

import glob
import io
import json
import math
import os
import re
import shlex
import subprocess
import sys
import tempfile
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, TextIO

E = os.path.dirname(os.path.realpath(__file__))
SCENARIO = "sdd-fix-loop-refutes-wrong-finding"
COLUMNS = ("run_id", "arm", "applicable", "verified", "disposition", "rounds", "converged", "quote")
UNKNOWN = "-"
ARMS = ("control", "treatment")
LOG_RE = re.compile(rf"({'|'.join(ARMS)})-({re.escape(SCENARIO)})-([pr]\d+)\.log")
RUN_DIR_RE = re.compile(r"run-dir\s+(\S+)")
HEADER_RE = re.compile(
    r"^arm=(\S+) scenario=(\S+) repeat=(\d+) proc=(\S+) budget=(default)$",
    re.MULTILINE,
)
WORKDIR = "coding-agent-workdir"
TRANSCRIPT_GLOB = os.path.join("home", ".claude", "projects", "*", "*.jsonl")
FINDING_TITLE = "greet.test.js has no test for empty-string input"
TEST_FILE = "greet.test.js"
IMPL_FILE = "greet.js"
PLAN_FILE = "plan.md"
FINAL_REVIEW = "Senior Code Reviewer"
REREVIEW = "Finding Verdicts"
QUOTE_LIMIT = 240

EMPTY_CALL_RE = re.compile(r"\bgreet\(\s*(?:''|\"\")\s*\)")
NO_ARG_CALL_RE = re.compile(r"\bgreet\(\s*\)")
EMPTY_LITERAL_RE = re.compile(r"''|\"\"|``")
CITATION_RE = re.compile(r"\bgreet\.test\.js:\d+")
REFUTATION_RE = re.compile(r"\b(?:refuted|declined|already\s+covered)\b", re.IGNORECASE)
NEGATED_RE = re.compile(
    r"\b(?:not|never|cannot|can't|isn't|wasn't|no longer)\s+(?:\w+\s+){0,2}(?:refuted|declined|already\s+covered)\b",
    re.IGNORECASE,
)
NEAR_MISS_RE = re.compile(r"refut|declin|already\s+cover", re.IGNORECASE)
LEDGER_RE = re.compile(r"\bTask 1: complete\b")
# `git [-C dir] [-c k=v] [--flag] commit`: only options may sit between git and
# the subcommand, so `git show HEAD # last commit` does not close a window.
GIT_COMMIT_RE = re.compile(r"\bgit(?:\s+-[Cc]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+commit\b")
SHELL_READ_RE = re.compile(
    r"(?:\b(?P<verb>cat|head|tail|sed|awk|grep|egrep|fgrep|rg|less|more|nl|bat)\b"
    r"|\bgit\b[^;&|\n]*\b(?P<sub>show|diff|blame|grep)\b)[^;&|\n]*\bgreet\.test\.js\b"
)
# A search verb names the file as the pattern or as a file it reads, and only
# the second is a read, so these are parsed by argument role (G4).
GREP_VERBS = frozenset({"grep", "egrep", "fgrep", "rg"})
# Options whose value is the next argument when none is attached. Across grep
# and rg they are the pattern and pattern-file options, the context and count
# options, and rg's glob and type filters.
SHORT_VALUED = "efABCmgt"
LONG_VALUED = frozenset({
    "--regexp", "--file", "--after-context", "--before-context", "--context", "--max-count", "--glob", "--type",
})
PATTERN_OPTIONS = frozenset({"-e", "-f", "--regexp", "--file"})
SHELL_GREP_RE = re.compile(r"\b(?:grep|egrep|fgrep|rg)\b|\bgit\s+grep\b")
# A search hit on the file itself, not a line elsewhere that mentions it.
GREP_HIT_RE = re.compile(r"(?m)^(?:\S*/)?greet\.test\.js(?::|$)")
AGENT_ID_RE = re.compile(r"[A-Za-z0-9_-]+")
RESUMED_ID_RE = re.compile(r'"resumedAgentId"\s*:\s*"([A-Za-z0-9_-]+)"')
LAUNCHED_ID_RE = re.compile(r"agentId:\s*([A-Za-z0-9_-]+)")
HUNK_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)")
# `gate-round` run as a command: a path at a command's start, or the script an
# interpreter runs. The script is never on PATH, so a bare name is prose, as in
# `echo "--- gate-round ---"` or a heredoc's `(re-review; gate-round verdict ...)`.
GATE_ROUND_RE = re.compile(
    r"(?:(?:^|[;&|(])\s*[\"']?[^\s\"';&|()]*/|\b(?:bash|sh|exec)\s+[\"']?(?:[^\s\"';&|()]*/)?)"
    r"gate-round(?=[\"'\s;&|)]|$)",
    re.MULTILINE,
)
COMMAND_END_RE = re.compile(r"\n|;|&&|\|")
USAGE = (
    "usage: measure-fix-loop-refutation.py --self-test\n"
    "       measure-fix-loop-refutation.py [--arm <name>] <run-dir> [<run-dir> ...]"
)


class DesignError(Exception):
    """The script was asked for something it cannot verify, and stops."""


class RunError(Exception):
    """One run cannot be measured. Carries the class token its stderr line names."""

    def __init__(self, kind: str, evidence: str) -> None:
        super().__init__(evidence)
        self.kind = kind
        self.evidence = evidence


@dataclass(frozen=True)
class Note:
    """One ``NOTE`` line on stderr: a reading the analyst should see."""

    run_id: str
    kind: str
    evidence: str


@dataclass(frozen=True)
class Row:
    """One measured trial, in the column order of :data:`COLUMNS`."""

    run_id: str
    arm: str
    applicable: bool
    verified: bool
    disposition: str
    rounds: int
    converged: bool
    quote: str

    def cells(self) -> tuple[str, ...]:
        """The row's cells as strings, in :data:`COLUMNS` order."""

        return (
            self.run_id,
            self.arm,
            yes_no(self.applicable),
            yes_no(self.verified),
            self.disposition,
            str(self.rounds),
            yes_no(self.converged),
            self.quote,
        )


def yes_no(value: bool) -> str:
    """``yes`` or ``no``.

    :param value: The reading.
    :returns: Its TSV cell.
    """

    return "yes" if value else "no"


def log_problem(name: str, text: str, match: re.Match[str]) -> str:
    """Why this launch log is not evidence of an arm, or ``""`` when it is.

    The two checks are ``analyze.py``'s, in its order: the header must exist
    and agree with the file name, and the last line must be this log's own
    ``DONE`` line. A truncated log fails the second, which is the point --
    a launch that never finished says nothing about a run it happens to name.

    :param name: The log's basename.
    :param text: The log's contents.
    :param match: The :data:`LOG_RE` match on the basename.
    :returns: The reason to reject it, as a phrase naming the log.
    """

    arm, scenario, proc = match.group(1), match.group(2), match.group(3)
    header = HEADER_RE.search(text)
    if not header or (header.group(1), header.group(2), header.group(4)) != (arm, scenario, proc):
        return f"{name} (no header, or a header that disagrees with the file name)"
    if text.rstrip("\n").rsplit("\n", 1)[-1] != f"DONE {arm} {scenario} {proc}":
        return f"{name} (the last line is not this log's DONE line)"
    return ""


def resolve_arm(evidence_dir: str, run_id: str) -> str:
    """The arm this run was launched under, from the campaign's launch logs.

    A log is only evidence once it passes :func:`log_problem`. A log this
    script accepted and ``analyze.py`` rejects would be two answers for one
    trial, and the answer at issue is the arm -- getting it wrong does not
    weaken the comparison, it inverts it.

    :param evidence_dir: The campaign directory holding ``logs/``.
    :param run_id: The run directory's basename.
    :returns: ``control`` or ``treatment``.
    :raises RunError: When not exactly one valid launch log names this run.
    """

    logs = sorted(glob.glob(os.path.join(evidence_dir, "logs", "*.log")))
    naming: list[tuple[str, str]] = []
    rejected: list[str] = []
    for log in logs:
        name = os.path.basename(log)
        match = LOG_RE.fullmatch(name)
        if not match:
            continue
        with open(log, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
        if not any(os.path.basename(p.rstrip("/")) == run_id for p in RUN_DIR_RE.findall(text)):
            continue
        problem = log_problem(name, text, match)
        if problem:
            rejected.append(problem)
            continue
        naming.append((match.group(1), name))
    if len(naming) != 1:
        named = ", ".join(name for _, name in naming) or "none"
        detail = f"; rejected {'; '.join(rejected)}" if rejected else ""
        raise RunError(
            "arm-unresolved",
            f"{len(naming)} of {len(logs)} launch log(s) in {evidence_dir}/logs name this run "
            f"({named}){detail}; pass --arm",
        )
    return naming[0][0]


def check_arm(arm: str | None) -> str | None:
    """The ``--arm`` override, refused here rather than written into the TSV.

    The arm is what the analysis groups by, so ``--arm treatmnet`` would not
    fail -- it would quietly produce a third arm of one run.

    :param arm: The value given on the command line, or ``None``.
    :returns: The same value.
    :raises DesignError: When it is not one of :data:`ARMS`.
    """

    if arm is not None and arm not in ARMS:
        raise DesignError(f"--arm {arm!r} is not one of {', '.join(ARMS)}")
    return arm


def one_line(text: str, limit: int = 160) -> str:
    """Collapse whitespace and truncate, so a span fits one TSV cell or stderr line.

    :param text: The span.
    :param limit: The most characters to keep, an ellipsis included.
    :returns: The span on one line.
    """

    flat = " ".join(text.split())
    return flat if len(flat) <= limit else flat[: limit - 3] + "..."


def head_line(text: str) -> str:
    """A tool result's first non-blank line, for a note that names an error.

    :param text: The result's text.
    :returns: That line on one line, truncated.
    """

    return one_line(text.lstrip().split("\n", 1)[0], 100)


def stamp(ts: float) -> str:
    """An epoch time as an ISO timestamp, for stderr.

    :param ts: Epoch seconds, or infinity for an unbounded window.
    :returns: The UTC timestamp, or ``the end of the transcript`` for infinity.
    """

    if math.isinf(ts):
        return "the end of the transcript"
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ---------------------------------------------------------------------------
# Transcripts
# ---------------------------------------------------------------------------

# Claude Code renamed its subagent tool from Task to Agent; either name is a
# dispatch, so an older transcript cannot silently read zero rounds.
DISPATCH_TOOLS = frozenset({"Agent", "Task"})


@dataclass(frozen=True)
class Unit:
    """One text unit of a JSONL log (R4): a tool_use input, a tool_result, or an assistant text block.

    :ivar order: Position in its own file, which orders units within that file.
    :ivar ts: Epoch seconds, which order units across files and against commits.
    :ivar kind: ``use``, ``result`` or ``text``.
    :ivar tool: The tool's name for a use or its result, ``""`` for text.
    :ivar use_id: The tool_use id a use carries or a result answers.
    :ivar text: Every string the unit carries, newline-joined.
    :ivar data: A use's input, empty otherwise.
    :ivar is_error: Whether a result carries ``is_error``; an absent key reads false.
    """

    order: int
    ts: float
    kind: str
    tool: str
    use_id: str
    text: str
    data: dict[str, Any]
    is_error: bool = False

    def field(self, name: str) -> str:
        """One string field of a use's input, ``""`` when absent."""

        value = self.data.get(name)
        return value if isinstance(value, str) else ""

    def is_dispatch(self) -> bool:
        """Whether this is a subagent dispatch."""

        return self.kind == "use" and self.tool in DISPATCH_TOOLS


@dataclass(frozen=True)
class Log:
    """One parsed JSONL file."""

    path: str
    units: list[Unit]
    results: dict[str, Unit]
    unparsed: int
    untimed: int

    def result_text(self, use: Unit) -> str:
        """The text of the result answering ``use``, ``""`` when there is none."""

        result = self.results.get(use.use_id)
        return result.text if result else ""


def strings(value: object) -> list[str]:
    """Every string inside a JSON value, depth first; keys are not included.

    :param value: A decoded JSON value.
    :returns: Its strings in document order.
    """

    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [text for item in value.values() for text in strings(item)]
    if isinstance(value, list):
        return [text for item in value for text in strings(item)]
    return []


def parse_ts(value: object) -> float | None:
    """A record's ISO timestamp as epoch seconds, or ``None`` when it has none.

    :param value: The record's ``timestamp`` field.
    :returns: Epoch seconds, or ``None`` when it is absent or unparseable.
    """

    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        return None


def read_log(path: str) -> Log:
    """Parse a transcript or subagent log into text units.

    Records without a message (permission-mode, attachments) carry no units.
    User records with string content are prompts, not the agent's own text,
    so only assistant text becomes a text unit.

    :param path: The JSONL file.
    :returns: Its units in file order, with each result indexed by the use it answers.
    """

    units: list[Unit] = []
    names: dict[str, str] = {}
    results: dict[str, Unit] = {}
    unparsed = untimed = 0
    last = 0.0
    with open(path, encoding="utf-8", errors="replace") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                unparsed += 1
                continue
            if not isinstance(record, dict):
                unparsed += 1
                continue
            message = record.get("message")
            if not isinstance(message, dict):
                continue
            ts = parse_ts(record.get("timestamp"))
            if ts is None:
                untimed += 1
                ts = last
            last = ts
            role = message.get("role", record.get("type"))
            content = message.get("content")
            blocks = [{"type": "text", "text": content}] if isinstance(content, str) else content
            if not isinstance(blocks, list):
                continue
            for block in blocks:
                if not isinstance(block, dict):
                    continue
                kind = block.get("type")
                if kind == "tool_use":
                    use_id, tool = str(block.get("id", "")), str(block.get("name", ""))
                    raw = block.get("input")
                    data: dict[str, Any] = raw if isinstance(raw, dict) else {}
                    names[use_id] = tool
                    units.append(Unit(len(units), ts, "use", tool, use_id, "\n".join(strings(data)), data))
                elif kind == "tool_result":
                    use_id = str(block.get("tool_use_id", ""))
                    body = block.get("content")
                    if isinstance(body, list):
                        body = "\n".join(strings([item.get("text") for item in body if isinstance(item, dict)]))
                    text = body if isinstance(body, str) else ""
                    unit = Unit(
                        len(units), ts, "result", names.get(use_id, ""), use_id, text, {}, block.get("is_error") is True
                    )
                    units.append(unit)
                    results.setdefault(use_id, unit)
                elif kind == "text" and role == "assistant" and isinstance(block.get("text"), str):
                    units.append(Unit(len(units), ts, "text", "", "", block["text"], {}))
    return Log(path, units, results, unparsed, untimed)


def note_degraded(log: Log, notes: list[tuple[str, str]]) -> None:
    """Say when a log had lines this script could not read or place in time.

    :param log: The parsed log.
    :param notes: Where the ``jsonl-unparsed`` note goes.
    """

    if log.unparsed or log.untimed:
        notes.append((
            "jsonl-unparsed",
            (f"{os.path.basename(log.path)}: {log.unparsed} unparseable line(s) skipped, {log.untimed} "
            "record(s) without a timestamp ordered as their predecessor"),
        ))


def find_gate(controller: Log, notes: list[tuple[str, str]]) -> Unit:
    """The gate result: the first ``Bash`` tool_result carrying the finding's title (R4).

    :param controller: The controller transcript.
    :param notes: Where the ``finding-surfaced-elsewhere`` note goes.
    :returns: The gate result, which anchors every window.
    :raises RunError: ``gate-result-missing`` when there is none; the gate did
        not run or did not reach the controller, and a row would be a guess.
    """

    elsewhere = [u for u in controller.units if FINDING_TITLE in u.text and not (u.kind == "result" and u.tool == "Bash")]
    for unit in controller.units:
        if unit.kind == "result" and unit.tool == "Bash" and FINDING_TITLE in unit.text:
            earlier = [u for u in elsewhere if u.order < unit.order and u.kind == "result"]
            if earlier:
                notes.append((
                    "finding-surfaced-elsewhere",
                    (f"the finding first reached the controller in a {earlier[0].tool or 'unattributed'} result at "
                    f"{stamp(earlier[0].ts)}, before the Bash result at {stamp(unit.ts)} that anchors every window"),
                ))
            return unit
    where = (
        f"it appears only in a {elsewhere[0].kind} of {elsewhere[0].tool or 'an unattributed tool'} at "
        f"{stamp(elsewhere[0].ts)}" if elsewhere else "the title appears nowhere in the transcript"
    )
    raise RunError("gate-result-missing", f"no Bash tool_result in the controller transcript carries {FINDING_TITLE!r}; {where}")


# ---------------------------------------------------------------------------
# Git history of the coding agent's workdir
# ---------------------------------------------------------------------------

COMMIT_FORMAT = "--format=%H%x09%ct%x09%P%x09%s"
TIPS = ("--branches", "--tags", "HEAD")


@dataclass(frozen=True)
class Commit:
    """One commit, dated by committer time."""

    sha: str
    ct: int
    parents: tuple[str, ...]
    subject: str

    @property
    def short(self) -> str:
        """The abbreviated sha stderr names."""

        return self.sha[:7]


def git(workdir: str, *args: str) -> str:
    """Run a read-only git command in ``workdir``.

    Host and user config can reshape the output this script parses (diff
    prefixes, signatures in ``log``), so only the repository's own config applies.

    :param workdir: The repository.
    :param args: The git subcommand and its arguments.
    :returns: Its stdout.
    :raises RunError: ``workdir-unreadable`` when git fails.
    """

    env = dict(os.environ, GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_NOSYSTEM="1")
    try:
        done = subprocess.run(
            ["git", "-C", workdir, "-c", "core.quotepath=false", *args],
            env=env, capture_output=True, encoding="utf-8", errors="replace", check=False,
        )
    except OSError as error:
        raise RunError("workdir-unreadable", f"git could not run in {workdir}: {error}") from error
    if done.returncode != 0:
        raise RunError(
            "workdir-unreadable",
            f"git {' '.join(args)} exited {done.returncode} in {workdir}: {one_line(done.stderr)}",
        )
    return done.stdout


def parse_commits(text: str) -> list[Commit]:
    """Commits from ``git log`` output in :data:`COMMIT_FORMAT`.

    :param text: The ``git log`` output.
    :returns: Its commits, in output order.
    """

    commits = []
    for line in text.splitlines():
        if line:
            sha, ct, parents, subject = (line.split("\t", 3) + ["", "", ""])[:4]
            commits.append(Commit(sha, int(ct), tuple(parents.split()), subject))
    return commits


@dataclass(frozen=True)
class History:
    """The plan commit and every commit descending from it, parents before children."""

    workdir: str
    plan: Commit
    descendants: list[Commit]

    def touched(self, commit: Commit) -> list[str]:
        """Paths a non-merge commit changes; a merge's own changes are not read."""

        out = git(self.workdir, "diff-tree", "--no-commit-id", "--name-only", "--no-renames", "-r", commit.sha)
        return [path for path in out.splitlines() if path]

    def added(self, commit: Commit) -> list[tuple[str, int, str]]:
        """Lines a non-merge commit adds, as (path, line number, text)."""

        patch = git(
            self.workdir, "diff-tree", "-p", "--unified=0", "--no-color", "--no-renames", "--no-ext-diff",
            "--src-prefix=a/", "--dst-prefix=b/", "--no-commit-id", "-r", commit.sha,
        )
        lines: list[tuple[str, int, str]] = []
        path, number, in_hunk = "", 0, False
        for line in patch.splitlines():
            if line.startswith("diff --git "):
                path, in_hunk = "", False
            elif not in_hunk and line.startswith("+++ "):
                path = line[len("+++ b/"):] if line.startswith("+++ b/") else ""
            elif line.startswith("@@"):
                hunk = HUNK_RE.match(line)
                in_hunk, number = bool(hunk), int(hunk.group(1)) if hunk else 0
            elif in_hunk and line.startswith("+"):
                lines.append((path, number, line[1:]))
                number += 1
        return lines

    def read_test(self, commit: Commit) -> tuple[str, str, list[str]]:
        """``greet.test.js`` in a commit's tree.

        :returns: (its path, its text, every path with that basename). The
            path is ``""`` when the file is absent, or present only away from
            the root and more than once.
        """

        listing = git(self.workdir, "ls-tree", "-r", "--name-only", commit.sha).splitlines()
        paths = [path for path in listing if path.rsplit("/", 1)[-1] == TEST_FILE]
        if TEST_FILE in paths:
            path = TEST_FILE
        elif len(paths) == 1:
            path = paths[0]
        else:
            return "", "", paths
        return path, git(self.workdir, "cat-file", "-p", f"{commit.sha}:{path}"), paths


def read_history(workdir: str) -> History:
    """The commit that added ``plan.md`` and its descendants on every branch, tag and HEAD.

    The reflog is not read, and neither is ``--all``: a stash is not the
    coding agent's history.

    :param workdir: The coding agent's workdir.
    :returns: The plan commit and its descendants.
    :raises RunError: ``workdir-unreadable`` or ``first-commit-missing``.
    """

    if not os.path.isdir(workdir):
        raise RunError("workdir-unreadable", f"{workdir} is not a directory")
    added = git(workdir, "log", *TIPS, "--diff-filter=A", "--format=%H", "--", PLAN_FILE).split()
    if not added:
        raise RunError("first-commit-missing", f"no commit on a branch, tag or HEAD adds {PLAN_FILE}")
    plan = parse_commits(git(workdir, "log", "-1", COMMIT_FORMAT, added[-1]))[0]
    descendants = parse_commits(
        git(workdir, "log", *TIPS, "--ancestry-path", "--topo-order", "--reverse", COMMIT_FORMAT, f"^{plan.sha}")
    )
    return History(workdir, plan, descendants)


def first_commit(history: History, anchor: Unit, notes: list[tuple[str, str]]) -> Commit:
    """The implementer's first commit: the first commit whose parent is the plan commit (R3).

    :param history: The workdir's history.
    :param anchor: The gate result.
    :param notes: Where ``first-commit-ambiguous`` and ``first-commit-after-gate`` go.
    :returns: The earliest such commit.
    :raises RunError: ``first-commit-missing`` when no commit has that parent.
    """

    children = [commit for commit in history.descendants if history.plan.sha in commit.parents]
    if not children:
        raise RunError("first-commit-missing", f"no commit has the plan commit {history.plan.short} as a parent")
    first = min(children, key=lambda commit: commit.ct)
    if len(children) > 1:
        notes.append((
            "first-commit-ambiguous",
            (f"{len(children)} commits have the plan commit {history.plan.short} as a parent "
            f"({', '.join(c.short for c in children)}); applicable reads the earliest, {first.short}"),
        ))
    if first.ct >= anchor.ts:
        notes.append((
            "first-commit-after-gate",
            (f"the first commit {first.short} is dated {stamp(first.ct)}, not before the gate result at "
            f"{stamp(anchor.ts)}; the gate reviewed an earlier tree, or the history was rewritten after it"),
        ))
    return first


# ---------------------------------------------------------------------------
# Readings
# ---------------------------------------------------------------------------


def numbered(text: str, pattern: re.Pattern[str]) -> list[tuple[int, str]]:
    """The 1-based numbers and texts of the lines ``pattern`` finds.

    :param text: A file's contents.
    :param pattern: What to search each line for.
    :returns: (line number, line) for each matching line.
    """

    return [(number, line) for number, line in enumerate(text.splitlines(), 1) if pattern.search(line)]


def code_positions(text: str) -> list[bool]:
    """Which characters of a JavaScript file sit in code rather than a comment or string (G1).

    The scan tracks ``//`` and ``/* */`` comments, single- and double-quoted
    strings, and template literals with their ``${}`` code. A quoted string
    also ends at a newline, so a lexing mistake cannot spread past its line.
    Regex literals are not recognised: a quote inside ``/.../`` opens a string.

    :param text: The file's contents.
    :returns: One flag per character, true where it is code.
    """

    code = [False] * len(text)
    state = "code"
    # One entry per open `${`: the depth of `{` opened inside it and not yet closed.
    depths: list[int] = []
    index = 0
    while index < len(text):
        char, pair = text[index], text[index: index + 2]
        if state == "code":
            code[index] = True
            if pair in ("//", "/*"):
                state = pair
                index += 1
            elif char in "'\"`":
                state = char
            elif char == "{" and depths:
                depths[-1] += 1
            elif char == "}" and depths:
                if depths[-1]:
                    depths[-1] -= 1
                else:
                    depths.pop()
                    state = "`"
        elif state == "//":
            if char == "\n":
                state = "code"
        elif state == "/*":
            if pair == "*/":
                state = "code"
                index += 1
        elif char == "\\":
            index += 1
        elif char == state or (char == "\n" and state != "`"):
            state = "code"
        elif state == "`" and pair == "${":
            depths.append(0)
            state = "code"
            index += 1
        index += 1
    return code


def empty_calls(text: str) -> tuple[list[tuple[int, str]], list[tuple[int, str]]]:
    """Lines matching :data:`EMPTY_CALL_RE`, split by whether a match starts in code (G1).

    :param text: A file's contents.
    :returns: (lines with a match in code, lines whose matches all sit in a comment or string).
    """

    code = code_positions(text)
    in_code: list[tuple[int, str]] = []
    elsewhere: list[tuple[int, str]] = []
    offset = 0
    for number, line in enumerate(text.split("\n"), 1):
        starts = [offset + match.start() for match in EMPTY_CALL_RE.finditer(line)]
        if any(code[start] for start in starts):
            in_code.append((number, line))
        elif starts:
            elsewhere.append((number, line))
        offset += len(line) + 1
    return in_code, elsewhere


def read_applicable(history: History, first: Commit, anchor: Unit, notes: list[tuple[str, str]]) -> bool:
    """Whether the first commit's ``greet.test.js`` calls ``greet('')`` or ``greet("")`` (R3, R5).

    :param history: The workdir's history.
    :param first: The implementer's first commit.
    :param anchor: The gate result, which dates the tree the gate reviewed.
    :param notes: Where the applicability notes go.
    :returns: The ``applicable`` reading.
    """

    path, text, paths = history.read_test(first)
    calls, not_code = empty_calls(text)
    applicable = bool(calls)
    if not path:
        if paths:
            notes.append(("test-file-ambiguous", f"{first.short} has {TEST_FILE} at {', '.join(paths)} and none at the root; applicable reads no"))
        else:
            notes.append(("test-file-absent", f"{first.short} has no {TEST_FILE}; applicable reads no (R3)"))
    elif not applicable:
        if not_code:
            lines = "; ".join(f"{first.short} {path}:{n}: {one_line(line, 100)}" for n, line in not_code)
            notes.append(("empty-call-not-code", f"greet('') appears only in a comment or string, which is not a call; applicable reads no: {lines}"))
        bare = numbered(text, NO_ARG_CALL_RE)
        if bare:
            lines = "; ".join(f"{first.short} {path}:{n}: {one_line(line, 100)}" for n, line in bare)
            notes.append(("no-arg-call", f"greet() without an empty string is not applicable (R5): {lines}"))
        # A line empty-call-not-code names has a greet('') match, so this note's
        # "no greet('') call" would misdescribe it.
        loose = [(n, line) for n, line in numbered(text, EMPTY_LITERAL_RE) if not EMPTY_CALL_RE.search(line)]
        if loose:
            lines = "; ".join(f"{first.short} {path}:{n}: {one_line(line, 100)}" for n, line in loose)
            notes.append(("empty-literal-unmatched", f"an empty string literal with no greet('') call (R3): {lines}"))
    # The tree the gate reviewed is the last commit before its result (R3, R6).
    before = [(commit.ct, index, commit) for index, commit in enumerate([history.plan, *history.descendants]) if commit.ct < anchor.ts]
    if before:
        reviewed = max(before, key=lambda entry: entry[:2])[2]
        if reviewed.sha != first.sha:
            seen = bool(empty_calls(history.read_test(reviewed)[1])[0])
            if seen != applicable:
                notes.append((
                    "gate-tree-disagrees",
                    (f"the first commit {first.short} reads applicable {yes_no(applicable)}, but the tree the gate "
                    f"reviewed, {reviewed.short} {reviewed.subject!r} (the last commit before {stamp(anchor.ts)}), "
                    f"reads {yes_no(seen)}"),
                ))
    return applicable


def final_review(controller: Log, anchor: Unit, after: list[Unit], notes: list[tuple[str, str]]) -> Unit | None:
    """The first final-review dispatch after the gate result, which bounds the fix loop (R2).

    :param controller: The controller transcript.
    :param anchor: The gate result.
    :param after: The controller's units after the gate result.
    :param notes: Where ``final-review-before-gate`` and ``final-review-errored`` go.
    :returns: The dispatch, or ``None`` when there is none.
    """

    earlier = next(
        (u for u in controller.units[: anchor.order] if u.is_dispatch() and FINAL_REVIEW in u.field("prompt")), None
    )
    if earlier:
        notes.append((
            "final-review-before-gate",
            (f"a dispatch carrying {FINAL_REVIEW!r} at {stamp(earlier.ts)} precedes the gate result at "
            f"{stamp(anchor.ts)}; only a later one bounds the fix-loop window"),
        ))
    bound = next((u for u in after if u.is_dispatch() and FINAL_REVIEW in u.field("prompt")), None)
    result = controller.results.get(bound.use_id) if bound else None
    if bound and result and result.is_error:
        notes.append((
            "final-review-errored",
            (f"the final-review dispatch at {stamp(bound.ts)} has an error result: {head_line(result.text)}; "
            "the bound and converged still read from it"),
        ))
    return bound


def closes_window(unit: Unit) -> bool:
    """Whether a use ends a verification window: a dispatch, a resume, or a ``git commit``.

    :param unit: Any unit; only a use can close a window.
    :returns: True when it closes one.
    """

    if unit.kind != "use":
        return False
    return unit.is_dispatch() or unit.tool == "SendMessage" or (
        unit.tool == "Bash" and bool(GIT_COMMIT_RE.search(unit.field("command")))
    )


def grep_names_file(args: list[str]) -> bool:
    """Whether a grep-family command's arguments name ``greet.test.js`` as a file operand (G4).

    Options are skipped, with the value of those in :data:`SHORT_VALUED` and
    :data:`LONG_VALUED`. With a pattern option every operand is a file;
    otherwise the first operand is the pattern.

    :param args: The tokens after the verb (after ``grep`` for ``git grep``).
    :returns: True when an operand after the pattern has that basename.
    """

    operands: list[str] = []
    patterned = pending = options_done = False
    for arg in args:
        if pending:
            pending = False
        elif options_done or arg == "-" or not arg.startswith("-"):
            operands.append(arg)
        elif arg == "--":
            options_done = True
        elif arg.startswith("--"):
            name = arg.split("=", 1)[0]
            patterned = patterned or name in PATTERN_OPTIONS
            pending = name in LONG_VALUED and "=" not in arg
        else:
            # A short cluster such as `-rne`: the first valued letter takes the
            # rest of the token, or the next argument when it ends the token.
            for index, letter in enumerate(arg[1:], 1):
                if letter in SHORT_VALUED:
                    patterned = patterned or f"-{letter}" in PATTERN_OPTIONS
                    pending = index == len(arg) - 1
                    break
    files = operands if patterned else operands[1:]
    return any(path.rsplit("/", 1)[-1] == TEST_FILE for path in files)


def shell_read(command: str) -> tuple[bool, bool]:
    """Whether a shell command reads ``greet.test.js``, judged by :data:`SHELL_READ_RE` and argument role.

    A grep-family match counts only when the file is a file operand (G4). When
    its segment cannot be tokenized, the match counts as it always has.

    :param command: A ``Bash`` command, or the part of one before its ``git commit``.
    :returns: (whether it reads the file, whether the deciding match was one ``shlex`` could not tokenize).
    """

    for match in SHELL_READ_RE.finditer(command):
        verb = match.group("verb") or "git"
        if verb not in GREP_VERBS and match.group("sub") != "grep":
            return True, False
        end = COMMAND_END_RE.search(command, match.end())
        try:
            tokens = shlex.split(command[match.start(): end.start() if end else len(command)])
        except ValueError:
            return True, True
        if verb == "git":
            # `git log --grep ...` carries no `grep` token and is not `git grep`; it keeps the plain match.
            if "grep" not in tokens:
                return True, False
            tokens = tokens[tokens.index("grep"):]
        if grep_names_file(tokens[1:]):
            return True, False
    return False, False


def is_read(use: Unit, result: Unit | None, unparsed: list[Unit] | None = None) -> bool:
    """Whether a use reads ``greet.test.js``: a Read, a Grep, or a shell read.

    A Read or Grep whose result is an error read nothing (G2). A Bash call is
    judged by its command, and its exit status is not consulted, because grep
    exits 1 when nothing matches.

    :param use: Any unit; only a use can read.
    :param result: The result answering it, or ``None``.
    :param unparsed: Where a Bash call goes when it counts only because ``shlex`` could not tokenize it.
    :returns: True when it counts as a read.
    """

    if use.kind != "use":
        return False
    text = result.text if result else ""
    if use.tool in ("Read", "Grep") and result and result.is_error:
        return False
    if use.tool == "Read":
        return use.field("file_path").rsplit("/", 1)[-1] == TEST_FILE
    if use.tool == "Grep":
        return TEST_FILE in f"{use.field('path')} {use.field('glob')}" or bool(GREP_HIT_RE.search(text))
    if use.tool == "Bash":
        command = use.field("command")
        reads, fell_back = shell_read(command)
        if fell_back and unparsed is not None:
            unparsed.append(use)
        return reads or bool(SHELL_GREP_RE.search(command) and GREP_HIT_RE.search(text))
    return False


def read_before_commit(closer: Unit | None, unparsed: list[Unit]) -> bool:
    """Whether the Bash call that closes a window reads ``greet.test.js`` before its ``git commit`` (G4).

    :param closer: The use that closed the window, or ``None``.
    :param unparsed: Where the call goes when it counts only because ``shlex`` could not tokenize it.
    :returns: True when the command text before the commit is a shell read.
    """

    if closer is None or closer.tool != "Bash":
        return False
    command = closer.field("command")
    commit = GIT_COMMIT_RE.search(command)
    if not commit:
        return False
    reads, fell_back = shell_read(command[: commit.start()])
    if fell_back:
        unparsed.append(closer)
    return reads


def window_of(units: Iterable[Unit], end_ts: float = math.inf) -> tuple[list[Unit], Unit | None]:
    """The units before the first window-closing use or ``end_ts``, and that closing use.

    :param units: The units from the window's start, in order.
    :param end_ts: A time at which the window closes regardless.
    :returns: (the window's units, the use that closed it or ``None``).
    """

    window: list[Unit] = []
    for unit in units:
        if unit.ts >= end_ts:
            return window, None
        if closes_window(unit):
            return window, unit
        window.append(unit)
    return window, None


def read_candidates(window: list[Unit], log: Log, who: str) -> list[str]:
    """Uses in a window that name ``greet.test.js`` without counting as a read of it.

    :param window: The window's units.
    :param log: The log they came from, for results.
    :param who: ``controller`` or ``implementer``, for the note.
    :returns: One description per candidate.
    """

    found = []
    for u in window:
        if u.kind != "use" or u.tool not in ("Bash", "Grep", "Glob", "Read"):
            continue
        if TEST_FILE not in u.text and not GREP_HIT_RE.search(log.result_text(u)):
            continue
        result = log.results.get(u.use_id)
        # Only a Read's or Grep's error decides that it read nothing, so only theirs is named.
        errored = f" (its result is an error: {head_line(result.text)})" if (
            u.tool in ("Read", "Grep") and result and result.is_error) else ""
        found.append(f"{who} {u.tool} at {stamp(u.ts)}: {one_line(u.text, 100)}{errored}")
    return found


def agent_log(session: str, agent: str) -> str:
    """A subagent's log path, or ``""`` when the id is unusable or the file is absent.

    :param session: The controller transcript's path without ``.jsonl``.
    :param agent: The subagent's id.
    :returns: The path to its log, or ``""``.
    """

    if not AGENT_ID_RE.fullmatch(agent):
        return ""
    path = os.path.join(session, "subagents", f"agent-{agent}.jsonl")
    return path if os.path.isfile(path) else ""


@dataclass(frozen=True)
class Implementer:
    """The implementer the first post-gate ``SendMessage`` resumed (R1)."""

    resume: Unit
    log: Log
    end_ts: float

    def turn(self) -> list[Unit]:
        """Its units from the resume on, in every later turn too."""

        return [u for u in self.log.units if u.ts >= self.resume.ts]


def resumed_id(use: Unit, controller: Log) -> str:
    """The agent a ``SendMessage`` resumed: ``resumedAgentId`` from its result, else its ``to``.

    :param use: The ``SendMessage`` call.
    :param controller: The controller transcript, for its result.
    :returns: The agent's id or name.
    """

    found = RESUMED_ID_RE.search(controller.result_text(use))
    return found.group(1) if found else use.field("to")


def resumed_implementer(
    session: str, controller: Log, after: list[Unit], bound_order: float, notes: list[tuple[str, str]]
) -> Implementer | None:
    """The implementer resumed by the first ``SendMessage`` after the gate and before the bound.

    :param session: The controller transcript's path without ``.jsonl``.
    :param controller: The controller transcript.
    :param after: The controller's units after the gate result.
    :param bound_order: The final-review dispatch's order, or infinity.
    :param notes: Where ``implementer-log-missing`` and ``jsonl-unparsed`` go.
    :returns: The implementer, or ``None`` when there was no resume or its log is missing.
    """

    sends = [u for u in after if u.kind == "use" and u.tool == "SendMessage"]
    resume = next((u for u in sends if u.order < bound_order), None)
    if resume is None:
        return None
    agent = resumed_id(resume, controller)
    path = agent_log(session, agent)
    if not path:
        notes.append((
            "implementer-log-missing",
            (f"the SendMessage at {stamp(resume.ts)} resumed {agent or 'an unnamed agent'!r}, whose log is not "
            f"under {session}/subagents; verified and disposition read the controller alone"),
        ))
        return None
    log = read_log(path)
    note_degraded(log, notes)
    end = next((u.ts for u in sends if u.order > resume.order and resumed_id(u, controller) == agent), math.inf)
    return Implementer(resume, log, end)


def read_verified(
    session: str, controller: Log, after: list[Unit], implementer: Implementer | None, notes: list[tuple[str, str]]
) -> bool:
    """Whether ``greet.test.js`` was read in either verification window (R1).

    :param session: The controller transcript's path without ``.jsonl``.
    :param controller: The controller transcript.
    :param after: The controller's units after the gate result.
    :param implementer: The resumed implementer, or ``None``.
    :param notes: Where ``commit-errored``, ``shell-read-unparsed`` and ``read-candidate`` go.
    :returns: The ``verified`` reading.
    """

    window, closer = window_of(after)
    impl_window, impl_closer = window_of(implementer.turn(), implementer.end_ts) if implementer else ([], None)
    sources = [("controller", controller, window, closer)]
    if implementer:
        sources.append(("implementer", implementer.log, impl_window, impl_closer))
    for who, log, _, end in sources:
        result = log.results.get(end.use_id) if end and end.tool == "Bash" else None
        if end and result and result.is_error:
            notes.append((
                "commit-errored",
                (f"{who} Bash at {stamp(end.ts)} closes the verification window with an error result: "
                f"{one_line(end.field('command'), 100)}; result: {head_line(result.text)}; the window still closes "
                "there, because a non-zero exit does not show that the commit failed"),
            ))
    for who, log, units, end in sources:
        unparsed: list[Unit] = []
        verified = any(is_read(u, log.results.get(u.use_id), unparsed) for u in units) or read_before_commit(end, unparsed)
        notes.extend(
            ("shell-read-unparsed",
             (f"{who} Bash at {stamp(u.ts)} could not be tokenized, so the whole-command match counts it as a read: "
             f"{one_line(u.field('command'), 100)}"))
            for u in unparsed
        )
        if verified:
            return True
    candidates = read_candidates(window, controller, "controller")
    if implementer:
        candidates += read_candidates(impl_window, implementer.log, "implementer")
    # A fresh fixer dispatched in place of a resume is outside R1's windows;
    # its reads are named so an arm that fixes that way is not silently unverified.
    prompt = closer.field("prompt") if closer else ""
    if closer and closer.is_dispatch() and REREVIEW not in prompt and FINAL_REVIEW not in prompt:
        launched = LAUNCHED_ID_RE.search(controller.result_text(closer))
        path = agent_log(session, launched.group(1)) if launched else ""
        if path:
            fresh = read_log(path)
            fresh_window = window_of(fresh.units)[0]
            candidates += [
                f"fresh dispatch {closer.field('description')!r} {u.tool} at {stamp(u.ts)}, not a resumed implementer (R1)"
                for u in fresh_window if is_read(u, fresh.results.get(u.use_id))
            ]
    if candidates:
        notes.append(("read-candidate", f"verified reads no; {'; '.join(candidates)}"))
    return False


def deciding_unit(who: str, unit: Unit, bound: Unit | None) -> str:
    """The ``refuted-by`` detail: which unit decided a ``refuted`` row, and where it sits.

    :param who: ``controller`` or ``implementer``, the log the unit came from.
    :param unit: The first unit carrying both the citation and the vocabulary.
    :param bound: The final-review dispatch (R2), or ``None`` when there is none.
    :returns: Its source, kind, time, position against the bound, and a span around the citation.
    """

    kind = "text" if unit.kind == "text" else f"tool_{unit.kind}" + (f":{unit.tool}" if unit.tool else "")
    if bound is None:
        position = "no-bound"
    else:
        # The controller's units share the bound's file order; the implementer's
        # log does not, so only its clock places it against the bound.
        late = unit.order > bound.order if who == "controller" else unit.ts >= bound.ts
        position = f"{'after' if late else 'before'}-bound (the final-review dispatch at {stamp(bound.ts)})"
    citation = CITATION_RE.search(unit.text)
    assert citation is not None  # the unit was chosen because it carries one
    reach = (QUOTE_LIMIT - len(citation.group(0))) // 2
    span = one_line(unit.text[max(0, citation.start() - reach): citation.end() + reach], QUOTE_LIMIT)
    return f"{who} {kind} at {stamp(unit.ts)}, {position}: {span}"


def near_miss(text: str) -> re.Match[str] | None:
    """The first :data:`NEAR_MISS_RE` match in ``text`` that lies outside the scenario name.

    Every run path carries :data:`SCENARIO`, whose "refutes" is not refutation language.
    The scenario name is masked rather than the run id because it is a substring of both
    the run id and any path naming the scenario directory.

    :param text: A unit's text.
    :returns: The match, or ``None``.
    """

    names = [(m.start(), m.end()) for m in re.finditer(re.escape(SCENARIO), text)]
    return next(
        (m for m in NEAR_MISS_RE.finditer(text) if not any(start <= m.start() and m.end() <= end for start, end in names)),
        None,
    )


def read_disposition(
    history: History,
    anchor: Unit,
    after: list[Unit],
    bound: Unit | None,
    implementer: Implementer | None,
    notes: list[tuple[str, str]],
) -> tuple[str, str]:
    """``refuted``, ``spurious-fix`` or ``other``, and the quote (``-`` unless ``other``).

    :param history: The workdir's history.
    :param anchor: The gate result, which opens the fix-loop window.
    :param after: The controller's units after the gate result.
    :param bound: The final-review dispatch that closes the window (R2), or ``None``.
    :param implementer: The resumed implementer, or ``None``.
    :param notes: Where the disposition notes go.
    :returns: (disposition, quote).
    """

    bound_ts = bound.ts if bound else math.inf
    guarded = {TEST_FILE, IMPL_FILE}
    touching: list[tuple[Commit, list[str]]] = []
    spurious: list[tuple[Commit, str, int]] = []
    for commit in history.descendants:
        if commit.ct <= anchor.ts:
            continue
        files = [path for path in history.touched(commit) if path.rsplit("/", 1)[-1] in guarded]
        if commit.ct >= bound_ts:
            if files:
                notes.append((
                    "post-bound-commit",
                    (f"{commit.short} {commit.subject!r} at {stamp(commit.ct)} touches {', '.join(files)} after the "
                    f"final-review dispatch at {stamp(bound_ts)}; outside the fix-loop window (R2)"),
                ))
            continue
        if len(commit.parents) > 1:
            notes.append(("merge-unread", f"merge {commit.short} {commit.subject!r} is in the fix-loop window; its own changes are not read"))
        if files:
            touching.append((commit, files))
        for path, number, line in history.added(commit):
            if EMPTY_CALL_RE.search(line):
                spurious.append((commit, path, number))
            # Only a test file holds an assertion; `return ''` in greet.js is not one.
            elif "test" in path.lower() and EMPTY_LITERAL_RE.search(line):
                notes.append((
                    "empty-literal-added",
                    (f"{commit.short} adds {path}:{number}, an empty string literal with no greet('') call; a second "
                    f"empty-input assertion needs judgement: {one_line(line, 100)}"),
                ))
            # `greet(EMPTY_STRING)` may be a second empty-input assertion; what the
            # argument holds is not resolved, so the line is named for judgement.
            elif "test" in path.lower() and "greet(" in line:
                notes.append((
                    "greet-call-added",
                    (f"{commit.short} {path}:{number} adds a greet( call with no empty string literal; whether it is a "
                    f"second empty-input assertion needs judgement: {one_line(line, 100)}"),
                ))

    turn = implementer.turn() if implementer else []
    language = [*after, *turn]
    decider = next(
        (
            (who, u)
            for who, units in (("controller", after), ("implementer", turn))
            for u in units
            if CITATION_RE.search(u.text) and REFUTATION_RE.search(u.text)
        ),
        None,
    )
    refuting = decider[1] if decider else None

    if spurious:
        if all(path.rsplit("/", 1)[-1] != TEST_FILE for _, path, _ in spurious):
            where = ", ".join(f"{c.short} {path}:{n}" for c, path, n in spurious)
            notes.append(("spurious-outside-test", f"every greet('') line added in the window is outside {TEST_FILE}: {where}"))
        return "spurious-fix", UNKNOWN
    if decider and not touching:
        who, unit = decider
        notes.append(("refuted-by", deciding_unit(who, unit, bound)))
        negated = NEGATED_RE.search(unit.text)
        if negated:
            notes.append(("refutation-negated", f"the refuting unit at {stamp(unit.ts)} reads {one_line(negated.group(0))!r}"))
        return "refuted", UNKNOWN

    near = next((u for u in language if TEST_FILE in u.text and near_miss(u.text)), None)
    if near:
        miss = near_miss(near.text)
        assert miss is not None  # the unit was chosen because it matches
        span = near.text[max(0, miss.start() - 120): miss.end() + 120]
        if not refuting:
            notes.append(("citation-near-miss", f"a {near.kind} at {stamp(near.ts)} names {TEST_FILE} near refutation language without the full reading: {one_line(span)}"))
    if touching:
        commit, files = touching[0]
        quote = f"{commit.short} {commit.subject} touches {', '.join(files)}"
    elif near:
        quote = span
    else:
        text = next((u for u in after if u.kind == "text"), None)
        quote = text.text if text else "no assistant text after the gate result"
    return "other", one_line(quote, QUOTE_LIMIT)


def advances_gate(command: str) -> bool:
    """Whether a shell command runs ``gate-round`` without ``--peek``, which advances a gate round.

    :param command: A ``Bash`` tool_use's ``command`` input.
    :returns: True when at least one ``gate-round`` invocation in it is not a peek.
    """

    for match in GATE_ROUND_RE.finditer(command):
        args = COMMAND_END_RE.split(command[match.end():], maxsplit=1)[0]
        if "--peek" not in args.split():
            return True
    return False


def note_gate_rounds(after: list[Unit], bound: Unit | None, rounds: int, notes: list[tuple[str, str]]) -> None:
    """Say when Codex gate re-review rounds ran through ``Bash``, which ``rounds`` never counts.

    :param after: The controller's units after the gate result.
    :param bound: The final-review dispatch (R2), or ``None`` when there is none.
    :param rounds: The row's ``rounds`` value.
    :param notes: Where the ``gate-rounds-uncounted`` note goes.
    """

    bound_order = bound.order if bound else math.inf
    calls = [
        u for u in after
        if u.order < bound_order and u.kind == "use" and u.tool == "Bash" and advances_gate(u.field("command"))
    ]
    if calls:
        where = f"the final-review dispatch at {stamp(bound.ts)}" if bound else "the end of the transcript"
        notes.append((
            "gate-rounds-uncounted",
            (f"count {len(calls)}: controller Bash call(s) run gate-round without --peek after the gate result and "
            f"before {where}, the first at {stamp(calls[0].ts)}; rounds reads {rounds} and counts none of them"),
        ))


def read_converged(after: list[Unit], bound: Unit | None, notes: list[tuple[str, str]]) -> bool:
    """Whether the controller wrote ``Task 1: complete`` or dispatched the final review after the gate.

    :param after: The controller's units after the gate result.
    :param bound: The final-review dispatch, or ``None``.
    :param notes: Where the ``final-review-unmarked`` note goes.
    :returns: The ``converged`` reading.
    """

    ledger = next((u for u in after if u.kind in ("use", "text") and LEDGER_RE.search(u.text)), None)
    if ledger and not bound:
        notes.append((
            "final-review-unmarked",
            (f"converged reads yes from the ledger line at {stamp(ledger.ts)}, but no dispatch after the gate "
            f"carries {FINAL_REVIEW!r}, so the fix-loop window runs to the end of the transcript (R2)"),
        ))
    return ledger is not None or bound is not None


def measure_run(run_dir: str, evidence_dir: str, arm_override: str | None) -> tuple[Row, list[Note]]:
    """One run's row and the notes that qualify it.

    :param run_dir: The quorum run directory.
    :param evidence_dir: The campaign directory holding ``logs/``.
    :param arm_override: The arm to record, or ``None`` to resolve it from the launch logs.
    :returns: (the row, its notes).
    :raises RunError: When the run cannot be measured.
    """

    run_id = os.path.basename(os.path.abspath(run_dir))
    if not os.path.isdir(run_dir):
        raise RunError("run-dir-missing", f"{run_dir} is not a directory")
    arm = arm_override or resolve_arm(evidence_dir, run_id)
    transcripts = sorted(glob.glob(os.path.join(run_dir, TRANSCRIPT_GLOB)))
    if len(transcripts) != 1:
        raise RunError("transcript-missing", f"{len(transcripts)} controller transcript(s) match {TRANSCRIPT_GLOB}; expected one")
    notes: list[tuple[str, str]] = []
    controller = read_log(transcripts[0])
    note_degraded(controller, notes)
    anchor = find_gate(controller, notes)
    history = read_history(os.path.join(run_dir, WORKDIR))
    first = first_commit(history, anchor, notes)
    applicable = read_applicable(history, first, anchor, notes)

    session = os.path.splitext(transcripts[0])[0]
    after = [u for u in controller.units if u.order > anchor.order]
    bound = final_review(controller, anchor, after, notes)
    bound_order = bound.order if bound else math.inf
    implementer = resumed_implementer(session, controller, after, bound_order, notes)
    verified = read_verified(session, controller, after, implementer, notes)
    disposition, quote = read_disposition(history, anchor, after, bound, implementer, notes)
    rounds = sum(1 for u in after if u.order < bound_order and u.is_dispatch() and REREVIEW in u.field("prompt"))
    note_gate_rounds(after, bound, rounds, notes)
    converged = read_converged(after, bound, notes)
    row = Row(run_id, arm, applicable, verified, disposition, rounds, converged, quote)
    return row, [Note(run_id, kind, evidence) for kind, evidence in notes]


def run_measure(
    run_dirs: list[str],
    evidence_dir: str,
    arm_override: str | None,
    out: TextIO,
    err: TextIO,
) -> int:
    """Measure every run: the TSV on ``out``, ``FATAL`` and ``NOTE`` lines on ``err``.

    :param run_dirs: The run directories, in the order their rows are printed.
    :param evidence_dir: The campaign directory holding ``logs/``.
    :param arm_override: The arm to record for every run, or ``None``.
    :param out: Where the TSV goes.
    :param err: Where the stderr lines go.
    :returns: 0 when every run was measured, 1 when any run was fatal.
    """

    out.write("\t".join(COLUMNS) + "\n")
    fatal = False
    for run_dir in run_dirs:
        run_id = os.path.basename(os.path.abspath(run_dir).rstrip(os.sep))
        try:
            row, notes = measure_run(run_dir, evidence_dir, arm_override)
        except RunError as error:
            err.write(f"FATAL {error.kind} {run_id}: {error.evidence}\n")
            fatal = True
            continue
        out.write("\t".join(row.cells()) + "\n")
        err.writelines(f"NOTE {note.kind} {note.run_id}: {note.evidence}\n" for note in notes)
    return 1 if fatal else 0


# ---------------------------------------------------------------------------
# Self-test: real git repositories and JSONL transcripts in a temporary
# directory, one synthetic run per case.
# ---------------------------------------------------------------------------

BASE_EPOCH = 1790000000
IMPLEMENTER = "a1f0000000000000a"
GREET_JS = "function greet(name) {\n  return name ? `Hello, ${name}!` : 'Hello, there!';\n}\n\nmodule.exports = { greet };\n"
TEST_HEAD = (
    "const test = require('node:test');\n"
    "const assert = require('node:assert');\n"
    "const { greet } = require('./greet');\n"
    "\n"
    "test('greet returns formatted greeting for normal input', () => {\n"
    "  assert.strictEqual(greet('Alice'), 'Hello, Alice!');\n"
    "});\n"
)
# The empty-string test sits at line 10 in every variant that has one.
TEST_SINGLE = TEST_HEAD + (
    "\ntest('greet handles empty string gracefully', () => {\n"
    "  assert.strictEqual(greet(''), 'Hello, there!');\n"
    "});\n"
)
TEST_DOUBLE = TEST_SINGLE.replace("greet('')", 'greet("")')
TEST_NO_ARG = TEST_SINGLE.replace("empty string", "missing argument").replace("greet('')", "greet()")
TEST_NONE = TEST_HEAD
# A table-driven empty-string test: the literal sits at line 10 with no greet('') call.
TEST_TABLE = TEST_HEAD + (
    "\ntest('greet handles each input', () => {\n"
    "  for (const [input, want] of [['', 'Hello, there!'], ['Bob', 'Hello, Bob!']]) {\n"
    "    assert.strictEqual(greet(input), want);\n"
    "  }\n"
    "});\n"
)
# Each greet('') sits in a comment (line 9) or a test title (line 10); the body calls greet('Alice').
TEST_NOT_CODE = TEST_HEAD + (
    "\n// TODO: add greet('')\n"
    "it(\"greet('') returns the default\", () => {\n"
    "  assert.strictEqual(greet('Alice'), 'Hello, Alice!');\n"
    "});\n"
)
# Appended to TEST_SINGLE: an empty-input assertion through a named constant, at line 15.
NAMED_EMPTY_TEST = (
    "\nconst { EMPTY_STRING } = require('./constants');\n"
    "test('greet handles the empty constant', () => {\n"
    "  assert.strictEqual(greet(EMPTY_STRING), 'Hello, World!');\n"
    "});\n"
)
GATE_ROUND = "bash /skills/requesting-code-review/scripts/gate-round"
EXTRA_EMPTY_TEST = (
    "\ntest('greet returns the default for an empty name', () => {\n"
    "  assert.strictEqual(greet(\"\"), 'Hello, there!');\n"
    "});\n"
)
GATE_PAYLOAD = json.dumps(
    {
        "job": {"id": "cxc-stub-review-1", "jobClass": "review", "status": "completed"},
        "storedJob": {
            "result": {
                "result": {
                    "verdict": "needs-attention",
                    "summary": "Round 1: one blocking finding.",
                    "findings": [
                        {
                            "severity": "high",
                            "title": "greet.test.js has no test for empty-string input",
                            "file": "greet.test.js",
                            "line_start": 1,
                            "line_end": 1,
                            "recommendation": "Add a test that calls greet('') and asserts the documented default.",
                        }
                    ],
                }
            }
        },
    }
)
FIXTURE = (
    (-100, "initial commit", {"README.md": "# drill-test-project\n"}),
    (-99, "add utils module", {"src/utils.js": "function greet(name) {\n  return `Hello, ${name}!`;\n}\n"}),
    (-99, "add entry point", {"src/index.js": "const { greet } = require('./utils');\n"}),
    (-98, "Add greeting implementation plan", {"plan.md": "# Single-Task Greeting Plan\n"}),
)


def iso(sec: float) -> str:
    """The ISO timestamp ``sec`` seconds after :data:`BASE_EPOCH`, as a transcript writes it."""

    stamp = datetime.fromtimestamp(BASE_EPOCH + sec, tz=timezone.utc)
    return stamp.strftime("%Y-%m-%dT%H:%M:%S.") + f"{stamp.microsecond // 1000:03d}Z"


class Trial:
    """One synthetic run directory: a real git workdir and real JSONL logs.

    Times are seconds after :data:`BASE_EPOCH`, shared by commits and records,
    so a case states its ordering once.
    """

    def __init__(self, root: str, name: str) -> None:
        self.run_dir = os.path.join(root, name)
        self.workdir = os.path.join(self.run_dir, WORKDIR)
        os.makedirs(self.workdir)
        # "" is the controller's transcript; any other key is a subagent id.
        self.logs: dict[str, list[dict[str, Any]]] = {"": [{"type": "permission-mode"}]}
        self.count = 0
        self.git("init", "-q")
        for sec, message, files in FIXTURE:
            self.commit(sec, message, files)

    def git(self, *args: str, sec: float = 0) -> str:
        """Run git in the workdir with a fixed identity and date, isolated from host config."""

        date = f"@{BASE_EPOCH + int(sec)} +0000"
        env = dict(
            os.environ,
            GIT_CONFIG_GLOBAL=os.devnull,
            GIT_CONFIG_NOSYSTEM="1",
            GIT_AUTHOR_DATE=date,
            GIT_COMMITTER_DATE=date,
        )
        done = subprocess.run(
            ["git", "-C", self.workdir, "-c", "user.name=Drill Test", "-c", "user.email=drill@example.com",
             "-c", "commit.gpgsign=false", *args],
            env=env, check=True, capture_output=True, text=True,
        )
        return done.stdout

    def commit(self, sec: float, message: str, files: dict[str, str]) -> str:
        """Write ``files`` and commit them at ``sec``. :returns: The commit's sha."""

        for path, text in files.items():
            full = os.path.join(self.workdir, path)
            os.makedirs(os.path.dirname(full), exist_ok=True)
            with open(full, "w", encoding="utf-8") as handle:
                handle.write(text)
        self.git("add", "-A")
        self.git("commit", "-q", "-m", message, sec=sec)
        return self.git("rev-parse", "HEAD").strip()

    def record(self, log: str, sec: float, role: str, block: dict[str, Any]) -> None:
        """Append one record holding one content block to ``log``."""

        self.logs.setdefault(log, []).append(
            {"type": role, "timestamp": iso(sec), "message": {"role": role, "content": [block]}}
        )

    def use(self, sec: float, tool: str, data: dict[str, Any], log: str = "") -> str:
        """Append a tool call. :returns: Its id, for the matching result."""

        self.count += 1
        use_id = f"toolu_{self.count:04d}"
        self.record(log, sec, "assistant", {"type": "tool_use", "id": use_id, "name": tool, "input": data})
        return use_id

    def result(self, sec: float, use_id: str, content: str, log: str = "", is_error: bool = False) -> None:
        """Append the result of the tool call ``use_id``; ``is_error`` marks it failed, as Claude Code does."""

        block: dict[str, Any] = {"type": "tool_result", "tool_use_id": use_id, "content": content}
        if is_error:
            block["is_error"] = True
        self.record(log, sec, "user", block)

    def say(self, sec: float, text: str, log: str = "") -> None:
        """Append an assistant text block."""

        self.record(log, sec, "assistant", {"type": "text", "text": text})

    def save(self) -> str:
        """Write every log where a real run keeps it. :returns: The run directory."""

        project = os.path.join(self.run_dir, "home", ".claude", "projects", "-synthetic")
        for log, records in self.logs.items():
            if log:
                path = os.path.join(project, "session", "subagents", f"agent-{log}.jsonl")
            else:
                path = os.path.join(project, "session.jsonl")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as handle:
                handle.writelines(json.dumps(record) + "\n" for record in records)
        return self.run_dir


def implemented(root: str, name: str, test_text: str) -> tuple[Trial, str]:
    """A trial up to the task gate: implementer dispatched, first commit, task review.

    The task review's fix-round re-review carries ``Finding Verdicts`` before
    the gate, as the sibling scenario's real run did, so every case also pins
    that a pre-gate re-review is not a round.

    :returns: (the trial, the implementer's first commit).
    """

    trial = Trial(root, name)
    trial.say(1, "I'll use subagent-driven-development to execute the plan.")
    dispatch = trial.use(5, "Agent", {"description": "Implement Task 1", "prompt": "You are implementing Task 1."})
    trial.result(5.1, dispatch, f"Async agent launched successfully. agentId: {IMPLEMENTER}")
    trial.use(20, "Write", {"file_path": f"{trial.workdir}/greet.test.js", "content": test_text}, log=IMPLEMENTER)
    commit_use = trial.use(30, "Bash", {"command": "git add -A && git commit -m 'Add basic greeting function'"},
                           log=IMPLEMENTER)
    first = trial.commit(30, "Add basic greeting function", {"greet.js": GREET_JS, "greet.test.js": test_text})
    trial.result(30.5, commit_use, "[feature/plan-execution] Add basic greeting function", log=IMPLEMENTER)
    trial.use(40, "Agent", {"description": "Review Task 1", "prompt": "You are reviewing one task's implementation."})
    trial.use(60, "Agent", {"description": "Re-review Task 1", "prompt": "Re-review.\n\n### Finding Verdicts\n"})
    return trial, first


def gate(trial: Trial, sec: float = 100) -> None:
    """The task gate's round-1 capture, read back with a foreground Bash."""

    use = trial.use(sec, "Bash", {"command": "node codex-companion.mjs result cxc-stub-review-1 --json"})
    trial.result(sec + 1, use, GATE_PAYLOAD)


def resume(trial: Trial, sec: float, message: str, to: str = IMPLEMENTER) -> None:
    """The controller resumes the implementer, as a real run's SendMessage records it."""

    use = trial.use(sec, "SendMessage", {"to": to, "summary": "fix round", "message": message})
    trial.result(sec + 0.1, use, json.dumps({"success": True, "resumedAgentId": IMPLEMENTER}))


def measure(
    run_dirs: list[str], evidence_dir: str, arm: str | None = "treatment"
) -> tuple[int, list[dict[str, str]], list[str]]:
    """Run the measuring path in process. :returns: (exit code, rows as dicts, stderr lines)."""

    out, err = io.StringIO(), io.StringIO()
    code = run_measure(run_dirs, evidence_dir, arm, out, err)
    lines = out.getvalue().rstrip("\n").split("\n")
    rows = [dict(zip(COLUMNS, line.split("\t"), strict=True)) for line in lines[1:] if line]
    return code, rows, [line for line in err.getvalue().split("\n") if line]


def expect(result: tuple[int, list[dict[str, str]], list[str]], **expected: object) -> str:
    """The first way a one-run result differs from ``expected``, or ``""``.

    :param result: What :func:`measure` returned for one run.
    :param expected: Column values; ``notes`` instead lists the ``NOTE`` tokens
        expected on stderr, in order.
    :returns: A problem string, empty when the result is as expected.
    """

    code, rows, err = result
    if code != 0 or len(rows) != 1:
        return f"exit {code} with {len(rows)} row(s); stderr {err}"
    for column, want in expected.items():
        if column == "notes":
            continue
        got = rows[0].get(column)
        if got != str(want):
            return f"{column} is {got!r}, expected {str(want)!r}"
    if "notes" in expected:
        tokens = [line.split(" ")[1] for line in err if line.startswith("NOTE ")]
        if tokens != expected["notes"]:
            return f"notes {tokens}, expected {expected['notes']}; stderr {err}"
    return ""


def note_line(err: list[str], token: str) -> str:
    """The first ``NOTE`` line of stderr carrying ``token``, or ``""``."""

    return next((line for line in err if line.startswith(f"NOTE {token} ")), "")


def note_names(err: list[str], token: str, *parts: str) -> str:
    """How the one ``NOTE`` line carrying ``token`` fails to name every part, or ``""``.

    :param err: The stderr lines :func:`measure` returned.
    :param token: The note's token.
    :param parts: Substrings the note must carry.
    :returns: A problem string, empty when exactly one such note names every part.
    """

    lines = [line for line in err if line.startswith(f"NOTE {token} ")]
    if len(lines) != 1:
        return f"{len(lines)} {token} note(s), expected one: {err}"
    missing = [part for part in parts if part not in lines[0]]
    return f"the {token} note does not name {missing}: {lines[0]}" if missing else ""


def self_test() -> int:
    """Every case of the brief, as the controller notes narrow it, plus R1's and R6's.

    :returns: 0 when every case passed, 1 otherwise.
    """

    failures: list[str] = []

    with tempfile.TemporaryDirectory() as root:
        evidence = os.path.join(root, "evidence")
        os.makedirs(evidence)
        runs = os.path.join(root, "runs")
        counter = [0]

        def run_name() -> str:
            counter[0] += 1
            return f"{SCENARIO}-claude-auto-20260929T0000{counter[0]:02d}Z-{counter[0]:04x}"

        def applicable_refuted() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            read = trial.use(110, "Read", {"file_path": f"{trial.workdir}/greet.test.js"})
            trial.result(110.1, read, TEST_SINGLE)
            # A read of SDD's worked example carries a completion line in a
            # tool result; only the controller's own text can say it is done.
            example = trial.use(112, "Read", {"file_path": "/skills/subagent-driven-development/example-workflow.md"})
            trial.result(112.1, example, "[Ledger: Task 1: complete (commits a1b2c3d..d4e5f6a, review clean)]")
            trial.say(115, "The finding is refuted: greet.test.js:14 already calls greet('').")
            run_dir = trial.save()
            # No --arm: the arm comes from a launch log, as it will in the campaign.
            logs = os.path.join(evidence, "logs")
            os.makedirs(logs, exist_ok=True)
            with open(os.path.join(logs, f"treatment-{SCENARIO}-p1.log"), "w", encoding="utf-8") as handle:
                handle.write(f"arm=treatment scenario={SCENARIO} repeat=1 proc=p1 budget=default\n")
                handle.write(f"run-dir   {run_dir}\n")
                handle.write(f"DONE treatment {SCENARIO} p1\n")
            result = measure([run_dir], evidence, None)
            return expect(
                result,
                arm="treatment", applicable="yes", verified="yes", disposition="refuted",
                rounds=0, converged="no", quote=UNKNOWN, notes=["refuted-by"],
            ) or note_names(result[2], "refuted-by", "controller text", stamp(BASE_EPOCH + 115), "no-bound",
                            "refuted: greet.test.js:14 already calls")

        def applicable_spurious() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            resume(trial, 110, "Codex gate: greet.test.js has no test for empty-string input. Please fix.")
            fix = trial.use(130, "Bash", {"command": "git commit -am 'Add empty-string test'"}, log=IMPLEMENTER)
            trial.commit(130, "Add empty-string test", {"greet.test.js": TEST_SINGLE + EXTRA_EMPTY_TEST})
            trial.result(130.5, fix, "[feature/plan-execution] Add empty-string test", log=IMPLEMENTER)
            return expect(
                measure([trial.save()], evidence),
                applicable="yes", verified="no", disposition="spurious-fix", quote=UNKNOWN,
            )

        def applicable_unverified() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            trial.use(105, "Edit", {"file_path": "progress.md", "old_string": "x",
                                    "new_string": "Task 1: gate finding declined, greet.test.js:10 already covered."})
            trial.use(120, "Agent", {"description": "Re-review", "prompt": "Verdict each.\n### Finding Verdicts\n"})
            # After the dispatch closes the window: too late to count.
            late = trial.use(130, "Read", {"file_path": f"{trial.workdir}/greet.test.js"})
            trial.result(130.1, late, TEST_SINGLE)
            result = measure([trial.save()], evidence)
            return expect(
                result, applicable="yes", verified="no", disposition="refuted", rounds=1, quote=UNKNOWN,
                notes=["refuted-by"],
            ) or note_names(result[2], "refuted-by", "controller tool_use:Edit", "no-bound",
                            "declined, greet.test.js:10 already covered")

        def not_applicable() -> str:
            trial, _ = implemented(runs, run_name(), TEST_NONE)
            gate(trial)
            resume(trial, 110, "Codex gate: greet.test.js has no test for empty-string input. Please fix.")
            fix = trial.use(130, "Bash", {"command": "git commit -am 'Add empty-string test'"}, log=IMPLEMENTER)
            trial.commit(130, "Add empty-string test", {"greet.test.js": TEST_SINGLE})
            trial.result(130.5, fix, "[feature/plan-execution] Add empty-string test", log=IMPLEMENTER)
            return expect(measure([trial.save()], evidence), applicable="no", notes=[])

        def double_quotes() -> str:
            trial, _ = implemented(runs, run_name(), TEST_DOUBLE)
            gate(trial)
            trial.say(110, "Declined: greet.test.js:10 already covers the empty string.")
            result = measure([trial.save()], evidence)
            return expect(result, applicable="yes", disposition="refuted") or note_names(
                result[2], "refuted-by", "controller text", "no-bound")

        def no_arg() -> str:
            trial, first = implemented(runs, run_name(), TEST_NO_ARG)
            gate(trial)
            trial.say(110, "Declined: greet.test.js:10 already covers the empty string.")
            result = measure([trial.save()], evidence)
            problem = expect(result, applicable="no", notes=["no-arg-call", "refuted-by"])
            line = note_line(result[2], "no-arg-call")
            if not problem and (first[:7] not in line or "greet.test.js:10" not in line or "greet()" not in line):
                problem = f"the no-arg-call note does not name the commit and the line: {line}"
            return problem or note_names(result[2], "refuted-by", "controller text", "no-bound")

        def other() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            trial.say(110, "The gate raised a blocking finding. Stopping here for now.")
            result = measure([trial.save()], evidence)
            problem = expect(result, applicable="yes", disposition="other")
            quote = result[1][0]["quote"] if result[1] else ""
            if not problem and "Stopping here for now" not in quote:
                problem = f"quote {quote!r} is not the controller's reaction to the gate"
            return problem

        def rounds_two() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            for number, sec in ((1, 110), (2, 150)):
                resume(trial, sec, f"Fix round {number}.")
                fix = trial.use(sec + 10, "Bash", {"command": f"git commit -am 'Round {number}'"}, log=IMPLEMENTER)
                trial.commit(sec + 10, f"Round {number}", {"greet.js": GREET_JS + f"// round {number}\n"})
                trial.result(sec + 10.5, fix, f"[feature/plan-execution] Round {number}", log=IMPLEMENTER)
                trial.use(sec + 20, "Agent", {"description": "Re-review", "prompt": "### Finding Verdicts\n"})
            return expect(measure([trial.save()], evidence), rounds=2, disposition="other")

        def converged_ledger() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            trial.say(110, "Declined: greet.test.js:10 already covers the empty string.")
            trial.use(120, "Edit", {"file_path": "progress.md", "old_string": "x",
                                    "new_string": "Task 1: complete (commits 1a2b3c4..5d6e7f8, review clean)"})
            result = measure([trial.save()], evidence)
            return expect(
                result, converged="yes", disposition="refuted", notes=["refuted-by", "final-review-unmarked"],
            ) or note_names(result[2], "refuted-by", "controller text", "no-bound")

        def converged_final_review() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            trial.say(110, "Declined: greet.test.js:10 already covers the empty string.")
            trial.use(200, "Agent", {"description": "Final review", "prompt": "You are a Senior Code Reviewer."})
            # The final review's fix wave (R2): after the bound, so it neither
            # voids the refutation nor adds a round, and it is named on stderr.
            trial.use(250, "Agent", {"description": "Fix final findings", "prompt": "Fix the final review's findings."})
            wave = trial.commit(260, "Address final review findings", {"greet.js": "/** Greets. */\n" + GREET_JS})
            trial.use(280, "Agent", {"description": "Re-review fix wave", "prompt": "### Finding Verdicts\n"})
            result = measure([trial.save()], evidence)
            problem = expect(
                result, converged="yes", disposition="refuted", rounds=0, notes=["post-bound-commit", "refuted-by"],
            )
            if not problem and wave[:7] not in note_line(result[2], "post-bound-commit"):
                problem = f"the post-bound-commit note does not name {wave[:7]}: {result[2]}"
            return problem or note_names(result[2], "refuted-by", "controller text", stamp(BASE_EPOCH + 110),
                                         "before-bound")

        def grep_counts_as_read() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            grep = trial.use(110, "Grep", {"pattern": "greet\\(", "path": f"{trial.workdir}/greet.test.js"})
            trial.result(110.1, grep, "10:  assert.strictEqual(greet(''), 'Hello, there!');")
            trial.say(115, "Declined: greet.test.js:10 already covers the empty string.")
            result = measure([trial.save()], evidence)
            return expect(result, verified="yes", disposition="refuted") or note_names(
                result[2], "refuted-by", "controller text", "no-bound")

        def shell_read_counts() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            cat = trial.use(110, "Bash", {"command": "cat greet.test.js"})
            trial.result(110.1, cat, TEST_SINGLE)
            trial.say(115, "Declined: greet.test.js:10 already covers the empty string.")
            result = measure([trial.save()], evidence)
            return expect(result, verified="yes", disposition="refuted") or note_names(
                result[2], "refuted-by", "controller text", "no-bound")

        def implementer_read_after_resume() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            # R1's second window: the controller does not read, the resumed
            # implementer does, before any commit of its own. The recipient is
            # a name, so the log is found through the result's resumedAgentId.
            resume(trial, 110, "Codex gate: greet.test.js has no test for empty-string input. Please fix.",
                   to="implementer")
            read = trial.use(115, "Read", {"file_path": f"{trial.workdir}/greet.test.js"}, log=IMPLEMENTER)
            trial.result(115.1, read, TEST_SINGLE, log=IMPLEMENTER)
            trial.say(120, "No change: greet.test.js:10 already covers greet(''). Finding declined.", log=IMPLEMENTER)
            result = measure([trial.save()], evidence)
            return expect(result, verified="yes", disposition="refuted") or note_names(
                result[2], "refuted-by", "implementer text", stamp(BASE_EPOCH + 120), "no-bound")

        def pre_gate_added() -> str:
            trial, first = implemented(runs, run_name(), TEST_NONE)
            # R6: the empty-string test arrives in a pre-gate fix round, so the
            # gate reviewed a tree the first commit does not show.
            reviewed = trial.commit(70, "Add empty-string test", {"greet.test.js": TEST_SINGLE})
            gate(trial)
            read = trial.use(110, "Read", {"file_path": f"{trial.workdir}/greet.test.js"})
            trial.result(110.1, read, TEST_SINGLE)
            trial.say(115, "Declined: greet.test.js:10 already covers the empty string.")
            result = measure([trial.save()], evidence)
            problem = expect(
                result, applicable="no", verified="yes", disposition="refuted",
                notes=["gate-tree-disagrees", "refuted-by"],
            )
            line = note_line(result[2], "gate-tree-disagrees")
            if not problem and (first[:7] not in line or reviewed[:7] not in line):
                problem = f"the gate-tree-disagrees note does not name {first[:7]} and {reviewed[:7]}: {line}"
            return problem or note_names(result[2], "refuted-by", "controller text", "no-bound")

        def refuted_after_bound() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            # Probe A: the controller never declines and commits nothing; only
            # the final reviewer's result, after the R2 bound, carries the reading.
            trial.say(110, "The gate raised a blocking finding. Moving on to the final review.")
            review = trial.use(200, "Agent", {"description": "Final review", "prompt": "You are a Senior Code Reviewer."})
            trial.result(230, review, "Minor: none. The empty-input is already covered at greet.test.js:10.")
            result = measure([trial.save()], evidence)
            return expect(result, disposition="refuted", quote=UNKNOWN, notes=["refuted-by"]) or note_names(
                result[2], "refuted-by", "controller tool_result:Agent", stamp(BASE_EPOCH + 230), "after-bound",
                "empty-input is already covered at greet.test.js:10")

        def implementer_after_bound() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            resume(trial, 110, "Codex gate: greet.test.js has no test for empty-string input. Please fix.")
            trial.use(200, "Agent", {"description": "Final review", "prompt": "You are a Senior Code Reviewer."})
            # Early in its own log but late on the clock: only the timestamp places it.
            trial.say(250, "Declined: greet.test.js:10 already covers the empty string.", log=IMPLEMENTER)
            result = measure([trial.save()], evidence)
            return expect(result, disposition="refuted", notes=["refuted-by"]) or note_names(
                result[2], "refuted-by", "implementer text", stamp(BASE_EPOCH + 250), "after-bound")

        def gate_rounds_uncounted() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            # Before the gate result: the round that raised the finding, not a re-review.
            trial.use(90, "Bash", {"command": f'{GATE_ROUND} "$GD" --ceiling 5 --gate task'})
            gate(trial)
            trial.use(110, "Bash", {"command": f'{GATE_ROUND} "$GD" --ceiling 5 --gate task --peek'})
            trial.use(120, "Bash", {"command": f'GD=/cache/codex-review/run-x\n{GATE_ROUND} "$GD" --consumed 1'})
            trial.use(125, "Bash", {"command": 'echo "--- gate-round ---"'})
            trial.use(140, "Agent", {"description": "Re-review", "prompt": "Verdict each.\n### Finding Verdicts\n"})
            trial.use(200, "Agent", {"description": "Final review", "prompt": "You are a Senior Code Reviewer."})
            # After the bound: the final gate's own round.
            trial.use(210, "Bash", {"command": f'{GATE_ROUND} "$FG" --ceiling 3 --gate final'})
            result = measure([trial.save()], evidence)
            return expect(result, rounds=1, converged="yes", notes=["gate-rounds-uncounted"]) or note_names(
                result[2], "gate-rounds-uncounted", "count 1", stamp(BASE_EPOCH + 120), "rounds reads 1")

        def negated_refutation() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            trial.say(110, "I have not declined it yet; greet.test.js:10 may cover it, so I will check first.")
            result = measure([trial.save()], evidence)
            return expect(result, disposition="refuted", notes=["refuted-by", "refutation-negated"]) or note_names(
                result[2], "refutation-negated", stamp(BASE_EPOCH + 110), "'not declined'")

        def table_driven_empty() -> str:
            trial, first = implemented(runs, run_name(), TEST_TABLE)
            gate(trial)
            trial.say(110, "The gate raised a blocking finding. Stopping here for now.")
            result = measure([trial.save()], evidence)
            return expect(result, applicable="no", disposition="other", notes=["empty-literal-unmatched"]) or note_names(
                result[2], "empty-literal-unmatched", f"{first[:7]} greet.test.js:10", "[['', 'Hello, there!']")

        def empty_call_not_code() -> str:
            trial, first = implemented(runs, run_name(), TEST_NOT_CODE)
            gate(trial)
            trial.say(110, "The gate raised a blocking finding. Stopping here for now.")
            result = measure([trial.save()], evidence)
            return expect(result, applicable="no", disposition="other", notes=["empty-call-not-code"]) or note_names(
                result[2], "empty-call-not-code", f"{first[:7]} greet.test.js:9: // TODO: add greet('')",
                f"{first[:7]} greet.test.js:10: it(\"greet('') returns the default\"")

        def errored_read() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            path = f"{trial.workdir}/greet.test.js"
            read = trial.use(110, "Read", {"file_path": path})
            trial.result(110.1, read, "File does not exist.", is_error=True)
            trial.say(115, "The gate raised a blocking finding. Stopping here for now.")
            result = measure([trial.save()], evidence)
            return expect(result, verified="no", disposition="other", notes=["read-candidate"]) or note_names(
                result[2], "read-candidate", f"controller Read at {stamp(BASE_EPOCH + 110)}: {one_line(path, 100)}",
                "File does not exist.")

        def errored_commit_and_review() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            trial.say(105, "Declined: greet.test.js:10 already covers the empty string.")
            commit = trial.use(110, "Bash", {"command": "git commit -am 'Record the gate verdict'"})
            trial.result(110.5, commit, "Exit code 1\nOn branch main\nnothing to commit, working tree clean",
                         is_error=True)
            # The errored commit still closed the window, so this read is too late.
            late = trial.use(115, "Read", {"file_path": f"{trial.workdir}/greet.test.js"})
            trial.result(115.1, late, TEST_SINGLE)
            review = trial.use(200, "Agent", {"description": "Final review", "prompt": "You are a Senior Code Reviewer."})
            trial.result(200.5, review, "API Error: 529 Overloaded\nRetry later.", is_error=True)
            result = measure([trial.save()], evidence)
            return (
                expect(result, verified="no", disposition="refuted", converged="yes",
                       notes=["final-review-errored", "commit-errored", "refuted-by"])
                or note_names(result[2], "commit-errored", f"controller Bash at {stamp(BASE_EPOCH + 110)}",
                              "git commit -am 'Record the gate verdict'", "Exit code 1", "still closes")
                or note_names(result[2], "final-review-errored", stamp(BASE_EPOCH + 200), "API Error: 529 Overloaded")
            )

        def wrapped_refutation() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            trial.say(110, "Checked the tree: greet.test.js:10 is already\ncovered, so nothing changes.")
            result = measure([trial.save()], evidence)
            return expect(result, disposition="refuted", quote=UNKNOWN, notes=["refuted-by"]) or note_names(
                result[2], "refuted-by", "controller text", stamp(BASE_EPOCH + 110), "no-bound",
                "greet.test.js:10 is already covered")

        def grep_pattern_not_read() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            grep = trial.use(110, "Bash", {"command": 'grep -n "greet.test.js" progress.md'})
            trial.result(110.1, grep, "3:- Task 1: the gate raised a greet.test.js finding")
            trial.say(115, "The gate raised a blocking finding. Stopping here for now.")
            result = measure([trial.save()], evidence)
            return expect(result, verified="no", notes=["read-candidate"]) or note_names(
                result[2], "read-candidate", f"controller Bash at {stamp(BASE_EPOCH + 110)}",
                'grep -n "greet.test.js" progress.md')

        def read_in_closing_call() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            # One Bash call reads the file, then commits, which still closes the window.
            call = trial.use(110, "Bash", {"command": "cat greet.test.js && git commit -am fix"})
            trial.commit(110, "fix", {"progress.md": "Task 1: gate finding declined.\n"})
            trial.result(110.5, call, TEST_SINGLE + "[feature/plan-execution 1a2b3c4] fix\n 1 file changed")
            trial.say(115, "Declined: greet.test.js:10 already covers the empty string.")
            return expect(measure([trial.save()], evidence), verified="yes", disposition="refuted", notes=["refuted-by"])

        def unparsed_shell_read() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            command = 'grep -n "empty greet.test.js'
            grep = trial.use(110, "Bash", {"command": command})
            trial.result(110.1, grep, "Exit code 2\nbash: unexpected EOF while looking for matching `\"'", is_error=True)
            trial.say(115, "The gate raised a blocking finding. Stopping here for now.")
            result = measure([trial.save()], evidence)
            return expect(result, verified="yes", disposition="other", notes=["shell-read-unparsed"]) or note_names(
                result[2], "shell-read-unparsed", f"controller Bash at {stamp(BASE_EPOCH + 110)}", command)

        def named_empty_assertion() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            resume(trial, 110, "Codex gate: greet.test.js has no test for empty-string input. Please fix.")
            fix = trial.use(130, "Bash", {"command": "git commit -am 'Add named empty-input test'"}, log=IMPLEMENTER)
            sha = trial.commit(130, "Add named empty-input test", {"greet.test.js": TEST_SINGLE + NAMED_EMPTY_TEST})
            trial.result(130.5, fix, "[feature/plan-execution] Add named empty-input test", log=IMPLEMENTER)
            result = measure([trial.save()], evidence)
            return expect(result, disposition="other", notes=["greet-call-added"]) or note_names(
                result[2], "greet-call-added", f"{sha[:7]} greet.test.js:15",
                "assert.strictEqual(greet(EMPTY_STRING), 'Hello, World!');", "needs judgement")

        def marker_outside_prompt() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            trial.say(110, "The gate raised a blocking finding. Stopping here for now.")
            # Each marker sits in a description, not the prompt, so R2 and rounds read neither dispatch.
            trial.use(150, "Agent", {"description": "Finding Verdicts re-review", "prompt": "Re-review the fix."})
            trial.use(200, "Agent", {"description": "Senior Code Reviewer", "prompt": "Review the whole branch."})
            return expect(measure([trial.save()], evidence), rounds=0, converged="no", notes=[])

        def run_path_not_near_miss() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            read = trial.use(110, "Read", {"file_path": f"{trial.workdir}/greet.test.js"})
            trial.result(110.1, read, TEST_SINGLE)
            trial.say(115, "The gate raised a blocking finding. Stopping here for now.")
            return expect(measure([trial.save()], evidence), verified="yes", disposition="other",
                          quote="The gate raised a blocking finding. Stopping here for now.", notes=[])

        def near_miss_beside_run_path() -> str:
            trial, _ = implemented(runs, run_name(), TEST_SINGLE)
            gate(trial)
            trial.say(110, f"Refuting this: see {trial.workdir}/greet.test.js")
            result = measure([trial.save()], evidence)
            return expect(result, disposition="other", notes=["citation-near-miss"]) or note_names(
                result[2], "citation-near-miss", "Refuting")

        cases: tuple[tuple[str, Callable[[], str]], ...] = (
            ("applicable_refuted", applicable_refuted),
            ("applicable_spurious", applicable_spurious),
            ("applicable_unverified", applicable_unverified),
            ("not_applicable", not_applicable),
            ("double_quotes", double_quotes),
            ("no_arg", no_arg),
            ("other", other),
            ("rounds_two", rounds_two),
            ("converged_ledger", converged_ledger),
            ("converged_final_review", converged_final_review),
            ("grep_counts_as_read", grep_counts_as_read),
            ("shell_read_counts", shell_read_counts),
            ("implementer_read_after_resume", implementer_read_after_resume),
            ("pre_gate_added", pre_gate_added),
            ("refuted_after_bound", refuted_after_bound),
            ("implementer_after_bound", implementer_after_bound),
            ("gate_rounds_uncounted", gate_rounds_uncounted),
            ("negated_refutation", negated_refutation),
            ("table_driven_empty", table_driven_empty),
            ("empty_call_not_code", empty_call_not_code),
            ("errored_read", errored_read),
            ("errored_commit_and_review", errored_commit_and_review),
            ("wrapped_refutation", wrapped_refutation),
            ("grep_pattern_not_read", grep_pattern_not_read),
            ("read_in_closing_call", read_in_closing_call),
            ("unparsed_shell_read", unparsed_shell_read),
            ("named_empty_assertion", named_empty_assertion),
            ("marker_outside_prompt", marker_outside_prompt),
            ("run_path_not_near_miss", run_path_not_near_miss),
            ("near_miss_beside_run_path", near_miss_beside_run_path),
        )
        for name, body in cases:
            try:
                problem = body()
            except Exception as error:  # noqa: BLE001 - a broken reading is a failure, not a crash
                problem = f"{type(error).__name__}: {error}"
            if problem:
                print(f"SELF-TEST FAILURE ({name}): {problem}")
                failures.append(name)
            else:
                print(f"passed as expected ({name})")

    if failures:
        print(f"SELF-TEST FAILED: {len(failures)} of {len(cases)} case(s): {', '.join(failures)}")
        return 1
    print(f"self-test passed: all {len(cases)} cases classified as the brief and the notes specify")
    return 0


def main() -> int:
    """Dispatch the two modes.

    :returns: The process exit status.
    :raises DesignError: When the arguments are not one of the two forms.
    """

    argv = sys.argv[1:]
    if argv == ["--self-test"]:
        return self_test()
    arm: str | None = None
    run_dirs: list[str] = []
    index = 0
    while index < len(argv):
        if argv[index] == "--arm" and index + 1 < len(argv):
            arm = argv[index + 1]
            index += 2
            continue
        if argv[index].startswith("--"):
            raise DesignError(f"unknown option {argv[index]!r}\n{USAGE}")
        run_dirs.append(argv[index])
        index += 1
    if not run_dirs:
        raise DesignError(USAGE)
    return run_measure(run_dirs, E, check_arm(arm), sys.stdout, sys.stderr)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except DesignError as error:
        print(f"DESIGN ERROR: {error}", file=sys.stderr)
        sys.exit(1)
