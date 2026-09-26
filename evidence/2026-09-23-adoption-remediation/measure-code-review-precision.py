#!/usr/bin/env python3
"""Recall and clean-hunk precision per trial of `code-review-precision-on-realistic-diff`.

Reads the reviewer subagent's own report out of a quorum run directory
(``home/.claude/projects/*/*/subagents/agent-*.jsonl``) rather than the main
agent's relay, because the relay drops findings and re-severities the ones it
keeps. Writes one TSV row per run to stdout -- how many of the two planted bugs
the review flagged, how many of the six correct-as-written hunks it blocked on,
how complete the proof of each Critical or Important finding was, and the
Gauntlet-Agent's own verdict beside the count -- followed by a ``disagreements``
block on stderr. Where the grader and the count disagree, the count governs and
the disagreement is reported.

Fail-closed contract. The script never infers a number it cannot derive:

* The six clean hunks and the two planted bugs are located by regex in the
  fixture blobs of the run's own ``coding-agent-workdir`` at ``HEAD``, never
  from line numbers written here, so a fixture edit cannot silently shift a
  range. A regex that does not resolve, or resolves twice, fails the run.
* ``states_trigger`` is a judgement, so it is read from an analyst-filled
  sidecar (``<run-id>-proof.tsv`` in this directory), never guessed. Without
  the sidecar, or with one this script cannot read, the row still carries the
  mechanical columns and ``-`` for ``proof_complete``: neither ``recall`` nor
  ``blocking_on_clean`` depends on the analyst's answers.
* A Critical or Important finding that lands on neither a clean hunk nor a
  planted bug is counted in ``proof_total`` and named on stderr for the analyst
  to adjudicate; it never silently raises ``blocking_on_clean``.
* A finding placed by a citation that could mean more than one region is
  counted where the brief puts it -- the planted bug -- and named on stderr
  too, because that is the one path that can raise ``recall`` with no other
  corroborating signal.
* Nothing is written into this evidence directory. ``--proof-template`` prints
  the sidecar skeleton to stdout for the analyst to redirect and fill in.

The ``disagreements`` block is one header line, then one tab-separated line per
item: run id, a stable class token, the evidence. The tokens are

``unattributed``
    A Critical or Important finding matched no range and no owning identifier.
``span-ambiguous``
    A Critical or Important finding was placed by a citation covering more than
    one range, or by one wider than the widest range there is, so which region
    it asserts a defect in is this script's inference rather than the
    reviewer's statement.
``grader-disagreement``
    The Gauntlet-Agent's verdict and this script's ``accepted`` differ, or the
    grader's verdict could not be read at all.
``proof-sidecar-missing``
    No ``<run-id>-proof.tsv``. The row is still emitted with ``proof_complete``
    unknown.
``proof-sidecar-invalid``
    The sidecar's header, a ``states_trigger`` value, or its finding set does
    not match the report.
``no-subagent-report``
    The run holds no reviewer subagent report, or more than one that could be.
``report-unparsed``
    The report carries no severity section at all, or one that has content but
    yields no findings; counting zero there would read as perfect precision.
``fixture-unresolved``
    The run's fixture could not be read, or a range regex did not resolve
    against it.
``arm-unresolved``
    No ``--arm`` and not exactly one launch log in ``logs/`` naming this run.
``run-dir-missing``
    A path given on the command line is not a directory.

Exit status is non-zero when any run could not be fully measured -- every token
above except ``unattributed``, ``span-ambiguous`` and ``grader-disagreement``,
which are readings for the analyst rather than instrument failures. A run that
fails emits no row; the other runs still do.

Usage::

    measure-code-review-precision.py --self-test
    measure-code-review-precision.py [--arm <name>] <run-dir> [<run-dir> ...]
    measure-code-review-precision.py --proof-template <run-dir> [<run-dir> ...]
"""

from __future__ import annotations

import glob
import hashlib
import io
import itertools
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from typing import TextIO

E = os.path.dirname(os.path.realpath(__file__))
EV = os.path.dirname(os.path.dirname(E))
SCENARIO = "code-review-precision-on-realistic-diff"
FIXTURES = os.path.join(EV, "src/setup-helpers/behavior-fixtures.ts")
COLUMNS = (
    "run_id",
    "arm",
    "recall",
    "blocking_on_clean",
    "clean_hunks_hit",
    "proof_complete",
    "proof_total",
    "grader_verdict",
    "accepted",
)
PROOF_COLUMNS = ("finding_key", "severity", "cites_line", "states_trigger", "text")
# One marker for "not known", used by clean_hunks_hit (no hunk was blocked on)
# and by proof_complete (no sidecar to read the analyst's answers from).
UNKNOWN = "-"
BLOCKING = ("Critical", "Important")
SEVERITIES = ("Critical", "Important", "Minor")
# The arm is not recorded in the run directory. analyze.py resolves it the same
# way: the campaign's launch logs are named <arm>-<scenario>-<proc>.log and each
# log's body records the run directories it produced. `--arm` is checked against
# the same vocabulary, so a typo cannot reach the column Task 18 groups by.
ARMS = ("control", "treatment")
LOG_RE = re.compile(rf"({'|'.join(ARMS)})-(.+)-([pr]\d+)\.log")
RUN_DIR_RE = re.compile(r"run-dir\s+(\S+)")
SUBAGENT_GLOB = "home/.claude/projects/*/*/subagents/agent-*.jsonl"
RESULT_GLOB = "gauntlet-agent/results/*/result.json"
WORKDIR = "coding-agent-workdir"


@dataclass(frozen=True)
class Span:
    """One located region of the fixture: a clean hunk, or a planted bug's single line."""

    key: str
    path: str
    start: int
    end: int

    @property
    def base(self) -> str:
        """The file's basename, which is how a finding's citation is matched.

        Reviewers cite `handlers.js:18`, `src/handlers.js:18` and
        `<sha>:src/handlers.js:18` interchangeably. The fixture's basenames are
        unique, so matching on them accepts all three without accepting a
        citation into some other tree.
        """

        return os.path.basename(self.path)


# The six hunks that are correct as written, in the order clean_hunks_hit lists
# them. Each carries the regex that locates its first line and the regex that
# locates the line after its last.
HUNKS: tuple[tuple[str, str, str, str], ...] = (
    ("with_retry", "src/util.js", r"^async function withRetry", r"^const ORDER_ID"),
    ("parse_order_id", "src/util.js", r"^const ORDER_ID", r"^module\.exports"),
    ("config_readfile", "src/config.js", r"^// Read once at startup", r"^module\.exports"),
    ("store_slice", "src/store.js", r"^async function listOrders", r"^async function saveOrder"),
    ("log_rethrow", "src/handlers.js", r"^\s*\} catch \(err\) \{", r"^\}"),
    ("test_fixture", "test/handlers.test.js", r"^const CLOCK", r"^test\("),
)
# The two planted defects, each a single line of src/handlers.js.
BUGS: tuple[tuple[str, str, str], ...] = (
    ("offset_bug", "src/handlers.js", r"^\s*const offset = page \* size;$"),
    ("unawaited_save", "src/handlers.js", r"^\s*store\.saveOrder\(order\);$"),
)
HUNK_KEYS = tuple(entry[0] for entry in HUNKS)
BUG_KEYS = tuple(entry[0] for entry in BUGS)
# The owning identifiers of each region, for a finding that cites no line this
# script can place. They are deliberately narrow: an identifier that also names
# another region would move a finding from one column to another, and an
# unattributed finding is reported for adjudication rather than lost. `[\s\S]`
# rather than `.` because a finding is a multi-line block.
#
# Case matters, so no pattern here carries `re.IGNORECASE`. The fixture's
# identifiers are camelCase or SHOUTED (`withRetry`, `CLOCK`, `ORDER_ID`) and
# folding case turns each of them into an ordinary English word a review of
# this diff is likely to use: "the server clock", "the orders", "retry the
# request". Only the alternatives that are prose rather than code are folded,
# one at a time, with `(?i:...)`. Three alternatives were dropped outright for
# naming two regions at once: `\bseeded\b` (any setup, not just `seed()`),
# `\brethrow\b` (`withRetry` rethrows `lastErr` as well as the `catch` arm
# `log_rethrow` is), and `\bconfig\.json\b` (the committed data file is part of
# the diff but is not the `readFileSync` hunk).
NAMES: dict[str, re.Pattern[str]] = {
    "offset_bug": re.compile(
        r"page\s*\*\s*size"
        r"|(?i:off[\s-]?by[\s-]?one)"
        r"|\blistOrdersHandler\b[\s\S]{0,500}?(?i:offset|paginat|1-based|one-based|first page)"
        r"|(?i:offset|paginat|1-based|one-based|first page)[\s\S]{0,500}?\blistOrdersHandler\b",
    ),
    "unawaited_save": re.compile(
        r"\bsaveOrder\b[\s\S]{0,500}?(?i:await|unhandled|floating|promise|201)"
        r"|(?i:await|unhandled|floating|promise|201)[\s\S]{0,500}?\bsaveOrder\b"
        r"|\bcreateOrderHandler\b[\s\S]{0,500}?(?i:await|unhandled|floating)",
    ),
    "with_retry": re.compile(r"\bwithRetry\b"),
    "parse_order_id": re.compile(r"\bparseOrderId\b|\bORDER_ID\b"),
    "config_readfile": re.compile(r"\breadFileSync\b|\bconfig\.js\b"),
    "store_slice": re.compile(r"\borders\.slice\b|\blistOrders(?!Handler)\b"),
    "log_rethrow": re.compile(
        r"\blog\.error\b|list failed|(?i:\blogs?[\s-]and[\s-]re-?throws?\b)",
    ),
    "test_fixture": re.compile(
        r"\bCLOCK\b|Date\.UTC|\bseed\(\)|handlers\.test\.js"
        r"|(?i:\bfixed clock\b|\bhard-?coded (?:test )?fixture\b)",
    ),
}
# Excluded from blocking_on_clean wherever it lands, as in the prior arms: a
# review that asks for a test is not asserting the reviewed code is wrong.
TEST_COVERAGE_RE = re.compile(r"test coverage|no test|untested|missing test", re.IGNORECASE)
HEADING_RE = re.compile(r"^\s{0,3}(#{1,6})\s+(.*\S)\s*$")
# A whole line that is nothing but a bold severity label, which some reports use
# in place of a heading.
LABEL_RE = re.compile(r"^\s{0,3}\*\*\s*(Critical|Important|Minor)\b[^*]*\*\*\s*$", re.IGNORECASE)
SEVERITY_RES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("Critical", re.compile(r"\bcritical\b", re.IGNORECASE)),
    ("Important", re.compile(r"\bimportant\b", re.IGNORECASE)),
    ("Minor", re.compile(r"\bminor\b|\bnice[- ]to[- ]have\b", re.IGNORECASE)),
)
# Every observed report numbers its findings and bolds the number. The bullet
# form is a fallback for a section that numbers nothing, and it is anchored at
# column 0: this scenario asks reviewers to state an input and an outcome, and
# they write those as indented `- **Input:**` sub-bullets. A pattern that
# tolerated leading spaces would cut one finding into three fragments, none of
# which carries the whole finding's text.
NUMBERED_RE = re.compile(r"^\s{0,3}(?:\*\*\s*\d+[.)]|\d+[.)]\s+\*\*)")
BULLET_RE = re.compile(r"^[-*+]\s+\*\*")
# A section that says it is empty, rather than one this script failed to read.
EMPTY_SECTION_RE = re.compile(
    r"^[\s*_`\-]*(?:none|n/?a|nothing|no\s+\w+\s+(?:findings|issues))\b[\s*_`.!]*$",
    re.IGNORECASE,
)
FILE_LINE_RE = re.compile(
    r"(?P<pre>(?:[0-9a-f]{7,40}|HEAD(?:~\d+|\^+)?):)?"
    r"(?P<path>(?:[\w.+-]+/)*[\w.+-]+\.(?:js|jsx|ts|tsx|json|md|sh|py))"
    r":(?P<lines>\d+(?:-\d+)?(?:\s*,\s*\d+(?:-\d+)?)*)"
)
# `061276df:src/db.js:10-13` and `HEAD~1:src/db.js:7` cite the *baseline*, not
# the diff under review. A real report did exactly this. Such a citation still
# counts as citing a file and line for the proof rule, but it cannot place a
# finding in a range of HEAD.
BASE_REF_RE = re.compile(r"^(?:[0-9a-f]{7,40}|HEAD(?:~\d+|\^+)):$")
FATAL = frozenset(
    {
        "proof-sidecar-missing",
        "proof-sidecar-invalid",
        "no-subagent-report",
        "report-unparsed",
        "fixture-unresolved",
        "arm-unresolved",
        "run-dir-missing",
    }
)
USAGE = (
    "usage: measure-code-review-precision.py --self-test\n"
    "       measure-code-review-precision.py [--arm <name>] <run-dir> [<run-dir> ...]\n"
    "       measure-code-review-precision.py --proof-template <run-dir> [<run-dir> ...]"
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
class Finding:
    """One Critical, Important or Minor finding of the reviewer's report."""

    severity: str
    text: str
    key: str
    cites_line: bool
    test_coverage: bool
    attributions: tuple[str, ...]
    # Why this finding's placement is an inference rather than the reviewer's
    # statement, or "" when it is not. See :func:`span_ambiguity`.
    ambiguity: str = ""


@dataclass(frozen=True)
class Note:
    """One line of the stderr `disagreements` block."""

    run_id: str
    kind: str
    evidence: str


@dataclass(frozen=True)
class Row:
    """One measured trial, in the column order of :data:`COLUMNS`."""

    run_id: str
    arm: str
    recall: int
    blocking_on_clean: int
    clean_hunks_hit: str
    proof_complete: str
    proof_total: int
    grader_verdict: str
    accepted: str

    def cells(self) -> tuple[str, ...]:
        """The row's cells as strings, in :data:`COLUMNS` order."""

        return (
            self.run_id,
            self.arm,
            str(self.recall),
            str(self.blocking_on_clean),
            self.clean_hunks_hit,
            self.proof_complete,
            str(self.proof_total),
            self.grader_verdict,
            self.accepted,
        )


def one_line(text: str, limit: int = 160) -> str:
    """Collapse text to one greppable line, truncated so a stderr line stays readable.

    :param text: Any text.
    :param limit: The most characters to keep.
    :returns: The text with runs of whitespace collapsed, truncated with an
        ellipsis when it was longer than ``limit``.
    """

    flat = " ".join(text.split())
    return flat if len(flat) <= limit else flat[: limit - 3] + "..."


def normalize(text: str) -> str:
    """A finding's text with every run of whitespace collapsed.

    This is what the join key hashes, so the key survives the analyst's sidecar
    being re-ordered, re-wrapped by an editor, or round-tripped through a TSV
    cell, and changes when the finding itself changes.

    :param text: The finding's raw block of the report.
    :returns: The normalized text.
    """

    return " ".join(text.split())


def finding_key(text: str) -> str:
    """The sidecar join key: twelve hex characters of the normalized text's sha256.

    :param text: The finding's raw block of the report.
    :returns: A stable twelve-character key.
    """

    return hashlib.sha256(normalize(text).encode("utf-8")).hexdigest()[:12]


def git_show(workdir: str, path: str) -> str:
    """One fixture file as committed, read from ``HEAD`` rather than the working tree.

    The agent under test has write access to the working tree, so a range
    resolved from the checkout could have been moved by the very session being
    measured.

    :param workdir: The run's ``coding-agent-workdir``.
    :param path: The fixture-relative path to read.
    :returns: The file's contents at ``HEAD``.
    :raises RunError: When git cannot produce the blob.
    """

    proc = subprocess.run(
        ["git", "-C", workdir, "show", f"HEAD:{path}"],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise RunError(
            "fixture-unresolved",
            f"cannot read {path} at HEAD from {workdir}: {one_line(proc.stderr)}",
        )
    return proc.stdout


def locate(key: str, path: str, blob: str, start_pat: str, end_pat: str) -> Span:
    """The inclusive line range of one clean hunk.

    :param key: The hunk key.
    :param path: The fixture-relative path, for the error message.
    :param blob: The file's contents at ``HEAD``.
    :param start_pat: The regex matching the hunk's first line.
    :param end_pat: The regex matching the first line after the hunk.
    :returns: The located span.
    :raises RunError: When either regex does not resolve.
    """

    lines = blob.split("\n")
    start = re.compile(start_pat)
    end = re.compile(end_pat)
    first = next((n for n, line in enumerate(lines, 1) if start.search(line)), 0)
    if not first:
        raise RunError("fixture-unresolved", f"{key}: {start_pat!r} matches no line of {path}")
    after = next((n for n, line in enumerate(lines, 1) if n > first and end.search(line)), 0)
    if not after:
        raise RunError(
            "fixture-unresolved",
            f"{key}: {end_pat!r} matches no line of {path} after line {first}",
        )
    return Span(key, path, first, after - 1)


def locate_bug(key: str, path: str, blob: str, pat: str) -> Span:
    """The single line of one planted bug.

    :param key: The bug key.
    :param path: The fixture-relative path, for the error message.
    :param blob: The file's contents at ``HEAD``.
    :param pat: The regex matching the planted line.
    :returns: The located span, one line wide.
    :raises RunError: When the regex matches no line, or more than one.
    """

    hits = [n for n, line in enumerate(blob.split("\n"), 1) if re.search(pat, line)]
    if len(hits) != 1:
        raise RunError(
            "fixture-unresolved",
            f"{key}: {pat!r} matches {len(hits)} lines of {path}, expected 1",
        )
    return Span(key, path, hits[0], hits[0])


def resolve_ranges(run_dir: str) -> dict[str, Span]:
    """The eight ranges, resolved against this run's own fixture.

    :param run_dir: The quorum run directory.
    :returns: Span by key, the two bugs first then the six hunks.
    :raises RunError: When the fixture cannot be read or a regex does not resolve.
    """

    workdir = os.path.join(run_dir, WORKDIR)
    if not os.path.isdir(os.path.join(workdir, ".git")):
        raise RunError("fixture-unresolved", f"{workdir} is not a git checkout of the fixture")
    blobs: dict[str, str] = {}
    spans: dict[str, Span] = {}
    for key, path, pat in BUGS:
        blobs.setdefault(path, git_show(workdir, path))
        spans[key] = locate_bug(key, path, blobs[path], pat)
    for key, path, start_pat, end_pat in HUNKS:
        blobs.setdefault(path, git_show(workdir, path))
        spans[key] = locate(key, path, blobs[path], start_pat, end_pat)
    return spans


def assistant_texts(path: str) -> list[str]:
    """Every assistant text block of a subagent transcript, in order.

    :param path: Path to an ``agent-*.jsonl`` transcript.
    :returns: The text of each assistant text content block.
    :raises RunError: When a non-empty line is not JSON.
    """

    texts: list[str] = []
    with open(path, encoding="utf-8", errors="replace") as handle:
        for number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as error:
                raise RunError(
                    "no-subagent-report",
                    f"{os.path.basename(path)}: malformed record at line {number} ({error.msg})",
                ) from None
            if not isinstance(record, dict) or record.get("type") != "assistant":
                continue
            message = record.get("message")
            content = message.get("content") if isinstance(message, dict) else None
            for part in content if isinstance(content, list) else []:
                if isinstance(part, dict) and part.get("type") == "text":
                    texts.append(str(part.get("text") or ""))
    return texts


def has_severity_section(text: str) -> bool:
    """Whether a block of text carries a Critical, Important or Minor section heading.

    Fenced blocks do not count, and the cut is made by the same
    :func:`split_sections` the parsers use, so the three agree. A transcript
    that merely quotes ``#### Critical (Must Fix)`` inside a fence is not a
    second report, and counting it as one would void the run.

    :param text: One assistant text block of a subagent transcript.
    :returns: Whether the block opens a severity section outside a fence.
    """

    return any(severity in SEVERITIES for severity, _ in split_sections(text))


def report_text(run_dir: str) -> str:
    """The reviewer subagent's own final report.

    The report is the last assistant text block that carries a severity
    section. Earlier blocks are the reviewer's narration ("Reading the diff
    now"), and the main agent's relay is in another transcript entirely.

    :param run_dir: The quorum run directory.
    :returns: The report text.
    :raises RunError: When the run holds no reviewer report, more than one
        transcript that could be it, or a transcript whose report this script
        cannot read as a review.
    """

    logs = sorted(glob.glob(os.path.join(run_dir, SUBAGENT_GLOB)))
    if not logs:
        raise RunError("no-subagent-report", f"no reviewer subagent report under {SUBAGENT_GLOB}")
    reports: list[tuple[str, str]] = []
    tail = ""
    for log in logs:
        texts = [text for text in assistant_texts(log) if text.strip()]
        tail = texts[-1] if texts else tail
        carrying = [text for text in texts if has_severity_section(text)]
        if carrying:
            reports.append((log, carrying[-1]))
    if len(reports) > 1:
        named = ", ".join(os.path.basename(log) for log, _ in reports)
        raise RunError(
            "no-subagent-report",
            f"{len(reports)} subagent transcripts carry a severity section ({named}), expected 1",
        )
    if not reports:
        # Reading a report this script cannot see the severities of as zero
        # findings would score it a perfect review.
        raise RunError(
            "report-unparsed",
            f"no Critical/Important/Minor section in {len(logs)} subagent transcript(s); "
            f"last assistant text: {one_line(tail, 120)}",
        )
    return reports[0][1]


def severity_of(line: str) -> str | None:
    """The severity a heading line opens.

    :param line: One line of the report.
    :returns: ``None`` when the line is not a heading, ``""`` when it is a
        heading that opens no severity section, else the severity.
    """

    heading = HEADING_RE.match(line)
    label = LABEL_RE.match(line)
    if not heading and not label:
        return None
    title = heading.group(2) if heading else line
    for severity, pattern in SEVERITY_RES:
        if pattern.search(title):
            return severity
    return ""


def split_sections(report: str) -> list[tuple[str, list[str]]]:
    """The report cut into (severity, body lines) at every heading.

    Fenced code blocks are passed through untouched: a diff or a snippet inside
    a finding can contain lines that look like headings.

    :param report: The reviewer's report.
    :returns: One entry per section, in order.
    """

    sections: list[tuple[str, list[str]]] = []
    current = ""
    body: list[str] = []
    fenced = False
    for line in report.split("\n"):
        if line.lstrip().startswith("```"):
            fenced = not fenced
            body.append(line)
            continue
        severity = None if fenced else severity_of(line)
        if severity is not None:
            sections.append((current, body))
            current, body = severity, []
            continue
        body.append(line)
    sections.append((current, body))
    return sections


def split_findings(severity: str, body: list[str]) -> list[str]:
    """One text block per finding of a severity section.

    :param severity: The section's severity, for the error message.
    :param body: The section's lines.
    :returns: The findings' raw text blocks.
    :raises RunError: When the section has content but yields no finding.
    """

    for pattern in (NUMBERED_RE, BULLET_RE):
        starts: list[int] = []
        fenced = False
        for index, line in enumerate(body):
            if line.lstrip().startswith("```"):
                fenced = not fenced
                continue
            if not fenced and pattern.match(line):
                starts.append(index)
        if starts:
            bounds = [*starts, len(body)]
            return ["\n".join(body[a:b]) for a, b in itertools.pairwise(bounds)]
    content = [line for line in body if line.strip() and not EMPTY_SECTION_RE.match(line)]
    if content:
        raise RunError(
            "report-unparsed",
            f"the {severity} section has content but no finding: {one_line(content[0], 80)}",
        )
    return []


def cited_spans(text: str) -> list[tuple[str, int, int]]:
    """Every (file basename, first line, last line) the finding cites in the diff.

    One citation per entry rather than a flattened set of lines, because how
    wide a citation is says how much of it the reviewer meant; see
    :func:`span_ambiguity`.

    Citations qualified by a commit (``<sha>:src/db.js:10``, ``HEAD~1:...``)
    point at the baseline and are dropped: they cannot place a finding in a
    range of ``HEAD``.

    :param text: The finding's text.
    :returns: The cited ranges, in the order they appear.
    """

    spans: list[tuple[str, int, int]] = []
    for match in FILE_LINE_RE.finditer(text):
        pre = match.group("pre") or ""
        if BASE_REF_RE.match(pre):
            continue
        base = os.path.basename(match.group("path"))
        for part in match.group("lines").split(","):
            ends = [int(number) for number in part.strip().split("-")]
            first, last = ends[0], ends[-1]
            if last < first or last - first > 1000:
                continue
            spans.append((base, first, last))
    return spans


def covered(span: Span, cited: list[tuple[str, int, int]]) -> bool:
    """Whether any citation overlaps one resolved region.

    :param span: The resolved region.
    :param cited: The finding's citations, from :func:`cited_spans`.
    :returns: Whether one of them touches the region.
    """

    return any(
        base == span.base and first <= span.end and last >= span.start
        for base, first, last in cited
    )


def attribute(text: str, ranges: dict[str, Span]) -> tuple[str, ...]:
    """The regions one finding asserts a defect in.

    A cited line places the finding; a finding whose citations land in no range
    is placed by the owning identifiers of the *planted bugs* only, and one
    that cites nothing at all by any region's identifiers. The asymmetry is the
    brief's rule 4: "I cannot place this" resolves toward the analyst's queue,
    not toward a silent `blocking_on_clean`. A reviewer who cites a line and
    misses the range by a statement or two has still told this script where to
    look, so a bug's name can still finish the job; a nit that names a clean
    hunk while citing a line in none of them (a `config.json` line, an import
    line) has not, and is reported for adjudication instead.

    A finding that reaches a planted bug is attributed to the bug alone:
    reviewers cite the enclosing function or a span around the defect, and
    reading that as a blocking finding against the correct code the span also
    covers would invent a precision failure. :func:`span_ambiguity` says when
    that precedence was what decided the attribution.

    :param text: The finding's text.
    :param ranges: The resolved spans by key.
    :returns: The keys the finding is attributed to, bugs before hunks and
        hunks in :data:`HUNKS` order, or empty when it lands nowhere.
    """

    cited = cited_spans(text)

    def by_line(keys: Iterable[str]) -> tuple[str, ...]:
        return tuple(key for key in keys if covered(ranges[key], cited))

    for keys in (BUG_KEYS, HUNK_KEYS):
        found = by_line(keys)
        if found:
            return found
    for keys in (BUG_KEYS,) if cited else (BUG_KEYS, HUNK_KEYS):
        named = tuple(key for key in keys if NAMES[key].search(text))
        if named:
            return named
    return ()


def span_ambiguity(text: str, ranges: dict[str, Span]) -> str:
    """Why this finding's placement is an inference, or ``""`` when it is not.

    Two shapes are ambiguous. A citation set that covers more than one region
    is placed by :func:`attribute`'s bug-first precedence rather than by the
    reviewer, and that is the one path that can raise ``recall`` with nothing
    else corroborating it. A single citation wider than the widest region there
    is cannot be a citation *of* a region -- it necessarily covers code outside
    every one of them -- so reading it as one is a guess even when only one
    region falls inside. The width is taken from the run's own resolved ranges
    (the widest is ``with_retry``, 14 lines) rather than from a number written
    here, so a fixture edit moves the threshold with it.

    Both are readings for the analyst, not instrument failures: the count still
    stands, and the stderr line says what it was read from.

    :param text: The finding's text.
    :param ranges: The resolved spans by key.
    :returns: The evidence string for a ``span-ambiguous`` line, or ``""``.
    """

    cited = cited_spans(text)
    if not cited:
        return ""
    hit = tuple(key for key in (*BUG_KEYS, *HUNK_KEYS) if covered(ranges[key], cited))
    quoted = ", ".join(f"{base}:{first}-{last}" for base, first, last in cited)
    if len(hit) > 1:
        return f"cited {quoted} covers {', '.join(hit)}; counted as {hit[0]}"
    widest = max(span.end - span.start + 1 for span in ranges.values())
    for base, first, last in cited:
        if last - first + 1 > widest and hit:
            return (
                f"cited {base}:{first}-{last} is wider than the widest region "
                f"({widest} lines); counted as {hit[0]}"
            )
    return ""


def parse_report(report: str, ranges: dict[str, Span] | None = None) -> list[Finding]:
    """Every severity-tagged finding of the report, attributed.

    :param report: The reviewer's report.
    :param ranges: The resolved spans by key, or ``None`` to skip attribution.
        The proof template needs each finding's severity, citation and text but
        not where it lands, so it can be printed for a run whose fixture this
        script does not know.
    :returns: The findings, in report order.
    :raises RunError: When a severity section cannot be read.
    """

    findings: list[Finding] = []
    for severity, body in split_sections(report):
        if severity not in SEVERITIES:
            continue
        for text in split_findings(severity, body):
            findings.append(
                Finding(
                    severity=severity,
                    text=text,
                    key=finding_key(text),
                    cites_line=bool(FILE_LINE_RE.search(text)),
                    test_coverage=bool(TEST_COVERAGE_RE.search(text)),
                    attributions=attribute(text, ranges) if ranges else (),
                    ambiguity=span_ambiguity(text, ranges) if ranges else "",
                )
            )
    return findings


def read_sidecar(path: str) -> dict[str, str]:
    """The analyst's `states_trigger` answers, keyed by finding.

    ``states_trigger`` is read case-insensitively: ``Yes`` is the analyst
    answering the question, not a malformed sidecar.

    :param path: Path to ``<run-id>-proof.tsv``.
    :returns: ``states_trigger`` by finding key, lowercased.
    :raises RunError: When the header, a key or a value is not what the
        template produced.
    """

    answers: dict[str, str] = {}
    header: tuple[str, ...] | None = None
    with open(path, encoding="utf-8") as handle:
        for number, raw in enumerate(handle, start=1):
            line = raw.rstrip("\n")
            if not line.strip() or line.startswith("#"):
                continue
            cells = tuple(line.split("\t"))
            if header is None:
                header = cells
                if header != PROOF_COLUMNS:
                    raise RunError(
                        "proof-sidecar-invalid",
                        f"{os.path.basename(path)}: header {list(header)} is not "
                        f"{list(PROOF_COLUMNS)}",
                    )
                continue
            if len(cells) < len(PROOF_COLUMNS):
                raise RunError(
                    "proof-sidecar-invalid",
                    f"{os.path.basename(path)}: line {number} has {len(cells)} columns, "
                    f"expected {len(PROOF_COLUMNS)}",
                )
            key, value = cells[0], cells[3].strip().lower()
            if key in answers:
                raise RunError(
                    "proof-sidecar-invalid", f"{os.path.basename(path)}: {key} listed twice"
                )
            if value not in ("yes", "no"):
                raise RunError(
                    "proof-sidecar-invalid",
                    f"{os.path.basename(path)}: states_trigger for {key} is {value!r}, "
                    "expected yes or no",
                )
            answers[key] = value
    if header is None:
        raise RunError("proof-sidecar-invalid", f"{os.path.basename(path)}: no header row")
    return answers


def proof_counts(findings: list[Finding], sidecar: str) -> tuple[str, int, bool]:
    """(proof_complete, proof_total, sidecar present) over the Critical and Important findings.

    :param findings: Every finding of the report.
    :param sidecar: Path to the run's ``<run-id>-proof.tsv``.
    :returns: ``proof_complete`` as a cell -- :data:`UNKNOWN` when there is no
        sidecar to read -- the total, and whether the sidecar was there.
    :raises RunError: When the sidecar does not answer exactly this report.
    """

    graded = [f for f in findings if f.severity in BLOCKING]
    if not graded:
        # A review that blocks on nothing asks the analyst nothing, so no
        # sidecar is owed and its absence is not a failure to measure.
        return "0", 0, True
    if not os.path.exists(sidecar):
        return UNKNOWN, len(graded), False
    answers = read_sidecar(sidecar)
    keys = {f.key for f in graded}
    missing = sorted(keys - set(answers))
    if missing:
        raise RunError(
            "proof-sidecar-invalid",
            f"{os.path.basename(sidecar)}: no states_trigger for finding(s) {missing}",
        )
    extra = sorted(set(answers) - keys)
    if extra:
        raise RunError(
            "proof-sidecar-invalid",
            f"{os.path.basename(sidecar)}: answers finding(s) {extra} that are not in the report",
        )
    complete = sum(1 for f in graded if f.cites_line and answers[f.key] == "yes")
    return str(complete), len(graded), True


def resolve_arm(evidence_dir: str, run_id: str) -> str:
    """The arm this run was launched under, from the campaign's launch logs.

    :param evidence_dir: The campaign directory holding ``logs/``.
    :param run_id: The run directory's basename.
    :returns: ``control`` or ``treatment``.
    :raises RunError: When not exactly one launch log names this run.
    """

    logs = sorted(glob.glob(os.path.join(evidence_dir, "logs", "*.log")))
    naming: list[tuple[str, str]] = []
    for log in logs:
        match = LOG_RE.fullmatch(os.path.basename(log))
        if not match:
            continue
        with open(log, encoding="utf-8", errors="replace") as handle:
            text = handle.read()
        if any(os.path.basename(p.rstrip("/")) == run_id for p in RUN_DIR_RE.findall(text)):
            naming.append((match.group(1), os.path.basename(log)))
    if len(naming) != 1:
        named = ", ".join(name for _, name in naming) or "none"
        raise RunError(
            "arm-unresolved",
            f"{len(naming)} of {len(logs)} launch log(s) in {evidence_dir}/logs name this run "
            f"({named}); pass --arm",
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


def read_grader(run_dir: str) -> tuple[str, str]:
    """The Gauntlet-Agent's own verdict and the evidence to quote beside it.

    :param run_dir: The quorum run directory.
    :returns: (the verdict, the evidence). The verdict is :data:`UNKNOWN` when
        the run holds no readable result, and the evidence then says so.
    """

    found = glob.glob(os.path.join(run_dir, RESULT_GLOB))
    if len(found) != 1:
        return UNKNOWN, f"{len(found)} gauntlet-agent result.json files, expected 1"
    try:
        with open(found[0], encoding="utf-8") as handle:
            result = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        return UNKNOWN, f"unreadable {RESULT_GLOB}: {one_line(str(error))}"
    if not isinstance(result, dict):
        return UNKNOWN, f"{RESULT_GLOB} is not a JSON object"
    verdict = str(result.get("status") or UNKNOWN)
    criteria = result.get("criteria")
    for entry in criteria if isinstance(criteria, list) else []:
        if isinstance(entry, dict) and entry.get("verdict") != "pass":
            return verdict, one_line(
                f"{entry.get('criterion')}: {entry.get('evidence')}",
            )
    return verdict, one_line(str(result.get("summary") or ""))


def measure_run(run_dir: str, evidence_dir: str, arm_override: str | None) -> tuple[Row, list[Note]]:
    """One run's row and its stderr lines.

    :param run_dir: The quorum run directory.
    :param evidence_dir: The campaign directory holding ``logs/`` and the
        proof sidecars.
    :param arm_override: The arm to record, bypassing the launch logs.
    :returns: (the row, the notes for the ``disagreements`` block).
    :raises RunError: When the run cannot be measured at all.
    """

    run_id = os.path.basename(os.path.abspath(run_dir).rstrip(os.sep))
    if not os.path.isdir(run_dir):
        raise RunError("run-dir-missing", f"{run_dir} is not a directory")
    arm = arm_override or resolve_arm(evidence_dir, run_id)
    ranges = resolve_ranges(run_dir)
    findings = parse_report(report_text(run_dir), ranges)
    graded = [f for f in findings if f.severity in BLOCKING]
    recall = sum(1 for key in BUG_KEYS if any(key in f.attributions for f in graded))
    blocked = {
        key
        for f in graded
        if not f.test_coverage
        for key in f.attributions
        if key in HUNK_KEYS
    }
    hit = tuple(key for key in HUNK_KEYS if key in blocked)
    # An unreadable sidecar voids the analyst's column, not the mechanical
    # ones: recall and blocking_on_clean are read from the report alone, and
    # dropping them too would cost the campaign a trial over a typo. The exit
    # status is still non-zero, as it is for a missing sidecar.
    invalid: Note | None = None
    try:
        complete, total, present = proof_counts(
            findings, os.path.join(evidence_dir, f"{run_id}-proof.tsv")
        )
    except RunError as error:
        if error.kind != "proof-sidecar-invalid":
            raise
        complete, total, present = UNKNOWN, len(graded), True
        invalid = Note(run_id, error.kind, error.evidence)
    accepted = "yes" if recall == 2 and not hit else "no"
    verdict, evidence = read_grader(run_dir)
    notes = [
        Note(run_id, "unattributed", f"{f.severity} finding {f.key}: {one_line(f.text)}")
        for f in graded
        if not f.attributions
    ]
    notes.extend(
        Note(run_id, "span-ambiguous", f"{f.severity} finding {f.key}: {f.ambiguity}")
        for f in graded
        if f.ambiguity
    )
    if invalid:
        notes.append(invalid)
    if not present:
        notes.append(
            Note(
                run_id,
                "proof-sidecar-missing",
                f"no {run_id}-proof.tsv in {evidence_dir}; proof_complete is unknown "
                f"(--proof-template {run_id} prints the skeleton)",
            )
        )
    # An unreadable verdict is a disagreement the analyst has to settle by
    # hand, the same as a contradicted one, so it gets the same line rather
    # than passing silently whenever `accepted` happens to be `no`.
    if verdict == UNKNOWN or (verdict == "pass") != (accepted == "yes"):
        notes.append(
            Note(
                run_id,
                "grader-disagreement",
                f"grader={verdict} accepted={accepted} recall={recall} "
                f"blocking_on_clean={len(hit)}; grader evidence: {evidence}",
            )
        )
    row = Row(
        run_id=run_id,
        arm=arm,
        recall=recall,
        blocking_on_clean=len(hit),
        clean_hunks_hit=",".join(hit) if hit else UNKNOWN,
        proof_complete=complete,
        proof_total=total,
        grader_verdict=verdict,
        accepted=accepted,
    )
    return row, notes


def run_measure(
    run_dirs: list[str],
    evidence_dir: str,
    arm_override: str | None,
    out: TextIO,
    err: TextIO,
) -> int:
    """Measure every run: the TSV on ``out``, the ``disagreements`` block on ``err``.

    :param run_dirs: The run directories, in the order their rows are printed.
    :param evidence_dir: The campaign directory holding ``logs/`` and the
        proof sidecars.
    :param arm_override: The arm to record for every run, or ``None``.
    :param out: Where the TSV goes.
    :param err: Where the ``disagreements`` block goes.
    :returns: 0 when every run was fully measured, 1 otherwise.
    """

    notes: list[Note] = []
    rows: list[Row] = []
    for run_dir in run_dirs:
        run_id = os.path.basename(os.path.abspath(run_dir).rstrip(os.sep))
        try:
            row, run_notes = measure_run(run_dir, evidence_dir, arm_override)
        except RunError as error:
            notes.append(Note(run_id, error.kind, error.evidence))
            continue
        rows.append(row)
        notes.extend(run_notes)
    out.write("\t".join(COLUMNS) + "\n")
    for row in rows:
        out.write("\t".join(row.cells()) + "\n")
    err.write("disagreements\n")
    err.writelines(f"{note.run_id}\t{note.kind}\t{note.evidence}\n" for note in notes)
    if not notes:
        err.write("(none)\n")
    return 1 if any(note.kind in FATAL for note in notes) else 0


def print_proof_templates(run_dirs: list[str], out: TextIO, err: TextIO) -> int:
    """Print the sidecar skeleton for every run, for the analyst to fill in.

    ``states_trigger`` is left blank; everything else is mechanical. The text
    column is the normalized text the join key hashes, so a filled-in row can
    be checked against the report without re-running anything. The fixture is
    not resolved here: the analyst answers the same question about a finding
    wherever it lands.

    :param run_dirs: The run directories.
    :param out: Where the skeletons go.
    :param err: Where a run's failure is reported.
    :returns: 0 when every run produced a skeleton, 1 otherwise.
    """

    failed = 0
    for run_dir in run_dirs:
        run_id = os.path.basename(os.path.abspath(run_dir).rstrip(os.sep))
        try:
            findings = parse_report(report_text(run_dir))
        except RunError as error:
            err.write(f"{run_id}\t{error.kind}\t{error.evidence}\n")
            failed = 1
            continue
        out.write(f"# {run_id}-proof.tsv\n")
        out.write("\t".join(PROOF_COLUMNS) + "\n")
        for finding in findings:
            if finding.severity not in BLOCKING:
                continue
            out.write(
                "\t".join(
                    (
                        finding.key,
                        finding.severity,
                        "yes" if finding.cites_line else "no",
                        "",
                        normalize(finding.text),
                    )
                )
                + "\n"
            )
    return failed


# ─── self-test ──────────────────────────────────────────────────────────

# The self-test's fixture is read out of the setup helper that builds the real
# one, so the line numbers the cases assert (the offset bug at src/handlers.js:18,
# withRetry's range around src/util.js:12) are the fixture's own and a helper
# edit that moves them fails here rather than silently re-pointing a case.
FIXTURE_FILES = (
    ("src/config.js", "REAL_CONFIG_CHANGED"),
    ("src/util.js", "REAL_UTIL_CHANGED"),
    ("src/store.js", "REAL_STORE_CHANGED"),
    ("src/handlers.js", "REAL_HANDLERS_CHANGED"),
    ("test/handlers.test.js", "REAL_TEST_CHANGED"),
)
OFFSET_FINDING = """**1. Pagination offset skips a whole page - `src/handlers.js:18`**

- **Input:** a request with `page=1, size=10`.
- **Outcome:** the handler asks the store for rows from 10, so the first ten
  orders are never returned on the first page.
"""
# The brief's `perfect` case cites src/handlers.js:36, which is the statement
# above the planted line; the name is what places it. Keeping the brief's number
# is deliberate -- it is the case that proves the fallback works.
SAVE_FINDING = """**2. The write is never awaited - `src/handlers.js:36`**

`store.saveOrder(order)` is called without `await`, so the handler returns 201
before the write resolves and a rejected write becomes an unhandled rejection.
"""
SAVE_FINDING_BY_LINE = """**2. The write is never awaited - `src/handlers.js:37`**

The handler returns 201 before the write resolves.
"""
SAVE_FINDING_NO_LINE = """**2. The write is never awaited - `src/handlers.js`**

`store.saveOrder(order)` is called without `await`.
"""
# Carries a fenced snippet whose lines read as a heading and a finding, because
# real reports quote the diff and a parser that did not track fences would cut
# a section there.
RETRY_FINDING = """**3. The retry loop swallows the last failure - `src/util.js:12`**

The catch arm assigns `lastErr` and continues, so a caller cannot tell a retry
from a success.

```js
#### Critical (Must Fix)
**4. quoted from the diff, not a finding**
```
"""
PARSE_FINDING = """**3. `parseOrderId` returns a sentinel instead of throwing**

Returning `null` for a malformed id leaves it to every caller to remember the
check, which is a latent 500.
"""
CONFIG_FINDING = """**3. Configuration is read synchronously - `src/config.js:7`**

The module blocks the event loop while it reads, and a later edit needs a
restart.
"""
STORE_FINDING = """**4. The page query copies the whole array - `src/store.js:6`**

Every call allocates a new array, which will not hold at scale.
"""
# The brief's text for `test_coverage_excluded`, verbatim: an Important "no
# test covers the retry path". It cites no line and names no region, so rule 4
# would carry the case whatever rule 3 said -- which is why the variant below
# exists rather than this one being extended.
COVERAGE_FINDING = """**3. No test covers the retry path**

Nothing exercises a failing first attempt, so a regression in the backoff is
invisible.
"""
# The same exclusion where rule 3 is the only thing that can produce it: this
# one lands inside `withRetry`'s range by line, so without the test-coverage
# exclusion it would raise blocking_on_clean.
COVERAGE_FINDING_ON_HUNK = """**3. No test covers the retry path in `withRetry` - `src/util.js:12`**

Nothing exercises a failing first attempt, so a regression in the backoff is
invisible.
"""
UNATTRIBUTED_FINDING = """**3. Requests carry no correlation id**

Nothing threads a request id through the handlers, so two concurrent failures
cannot be told apart afterwards.
"""
# The span a reviewer actually cites: wide enough to cover the defect it is
# reporting and the correct `catch` below it.
SPAN_FINDING = """**1. Pagination is off by one page - `src/handlers.js:14-30`**

- **Input:** `page=1, size=10`.
- **Outcome:** the first ten orders are skipped, because the offset is computed
  from a 1-based page as though it were 0-based.
"""
MINOR_RETRY_FINDING = """**3. The backoff is not jittered - `src/util.js:12`**

Simultaneous callers will retry in lockstep. Worth a look, not a blocker.
"""
# A whole-file citation. It covers both planted lines and everything between,
# so reading it as full recall is an inference the analyst has to see.
WHOLE_FILE_FINDING = """**1. The handlers module does too much - `src/handlers.js:1-42`**

Pagination, validation, persistence and logging all live in one file.
"""
# The next four are the shapes the round-1 review found misclassified. Their
# text is the review's own, so a regression puts the defect back and this
# suite says which one.
#
# `src/handlers.js:36` is the statement above the unawaited write and lands in
# no range; "the server clock" is ordinary English about it. Under a
# case-folded `\\bCLOCK\\b` this attributed to `test_fixture`, a hunk in
# another file, and scored as a precision failure.
CLOCK_FINDING = """**3. `createOrderHandler` trusts the client's timestamp - `src/handlers.js:36`**

The caller supplies `createdAt`, so two orders can disagree with the server clock.
"""
CLOCK_PROSE_FINDING = """**4. Order timestamps are not deterministic**

Nothing pins the clock, so two runs of the same request disagree.
"""
# `catch` within 300 characters of `log`, case-folded, used to attribute this
# to `log_rethrow` -- a different region of a different file, and one this
# finding says nothing about.
RETHROW_PROSE_FINDING = """**5. The retry loop loses the failure history**

The catch arm keeps only the last error, so there is nothing to log when the
third attempt fails too.
"""
# `config.json` is committed in the diff but is not one of the six hunks, and
# an import line sits in no range at all. Both cite a line this script cannot
# place, so under the brief's rule 4 they go to the analyst rather than to
# `blocking_on_clean`.
CONFIG_JSON_FINDING = """**4. `config.json` is committed with production defaults - `config.json:2`**

A deployment that forgets to override them inherits whatever was committed.
"""
IMPORT_NIT_FINDING = """**5. The util import couples the handlers module to two helpers - `src/handlers.js:5`**

`withRetry` and `parseOrderId` arrive from one require, so the module cannot
be read without both.
"""
# The unnumbered form, with the sub-bullets this scenario's AC asks reviewers
# to write. A bullet pattern that matched indented lines would read each of
# these as three findings and split the coverage finding away from its
# citation.
BULLET_SAVE_FINDING = """- **The write is never awaited - `src/handlers.js:37`**
  - **Input:** a create whose write rejects.
  - **Outcome:** the handler has already answered 201.
"""
BULLET_COVERAGE_FINDING = """- **No test covers the retry path**
  - **Input:** a first attempt that rejects - `src/util.js:12`.
  - **Outcome:** a regression in the backoff is invisible.
"""
# A second subagent that only quotes a report's heading inside a fence. It is
# not a report, and counting it as one would void the run.
QUOTING_TRANSCRIPT = """I read the reviewer's report and relayed it. It opened with

```md
#### Critical (Must Fix)
**1. Pagination offset skips a whole page - `src/handlers.js:18`**
```

and I passed the two blocking findings on unchanged.
"""


def fixture_blobs() -> dict[str, str]:
    """The fixture's commit-2 files, read out of the setup helper's template literals.

    :returns: File contents by fixture-relative path.
    :raises DesignError: When the helper does not hold the expected constants.
    """

    with open(FIXTURES, encoding="utf-8") as handle:
        source = handle.read()
    blobs: dict[str, str] = {}
    for path, constant in FIXTURE_FILES:
        opening = f"const {constant} = `"
        start = source.find(opening)
        if start < 0:
            raise DesignError(f"{FIXTURES}: no constant {constant}; the fixture has moved")
        index = start + len(opening)
        out: list[str] = []
        while index < len(source) and source[index] != "`":
            if source[index] == "\\" and index + 1 < len(source) and source[index + 1] in "`$\\":
                out.append(source[index + 1])
                index += 2
                continue
            out.append(source[index])
            index += 1
        if index >= len(source):
            raise DesignError(f"{FIXTURES}: {constant} has no closing backtick")
        blobs[path] = "".join(out)
    return blobs


def build_fixture(root: str) -> str:
    """A git checkout of the fixture at ``HEAD``, to be copied into each synthetic run.

    :param root: A temporary directory.
    :returns: The checkout's path.
    :raises DesignError: When git fails.
    """

    path = os.path.join(root, "fixture-template")
    os.makedirs(path)
    for name, text in fixture_blobs().items():
        target = os.path.join(path, name)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(text)
    env = dict(os.environ, GIT_CONFIG_GLOBAL=os.devnull, GIT_CONFIG_SYSTEM=os.devnull)
    for args in (
        ["init", "-q", "-b", "main"],
        ["add", "-A"],
        [
            "-c",
            "user.email=drill@test.local",
            "-c",
            "user.name=Drill Test",
            "commit",
            "-q",
            "-m",
            "paginate order listing and add order creation",
        ],
    ):
        proc = subprocess.run(
            ["git", "-C", path, *args], capture_output=True, text=True, check=False, env=env
        )
        if proc.returncode != 0:
            raise DesignError(f"self-test fixture: git {args[0]} failed: {one_line(proc.stderr)}")
    return path


def build_report(
    critical: list[str], important: list[str], minor: list[str] | None = None
) -> str:
    """A reviewer report in the shape the real reports take.

    The Strengths section carries a citation inside a clean hunk's range: it
    must never be counted, and a parser that ignored severity sections would.

    :param critical: The Critical findings' text blocks.
    :param important: The Important findings' text blocks.
    :param minor: The Minor findings' text blocks.
    :returns: The report.
    """

    parts = [
        '## Review: "paginate order listing and add order creation"',
        "",
        "### Strengths",
        "",
        "- **`src/util.js:7-20`** - `withRetry` is correct as written: three attempts,",
        "  exponential backoff, rethrows after the last.",
        "",
        "### Issues",
        "",
    ]
    for label, findings in (
        ("#### Critical (Must Fix)", critical),
        ("#### Important (Should Fix)", important),
        ("#### Minor (Nice to Have)", minor or []),
    ):
        parts.append(label)
        parts.append("")
        if not findings:
            parts.extend(["_None._", ""])
            continue
        for text in findings:
            parts.append(text.rstrip("\n"))
            parts.append("")
    parts.extend(["### Assessment", "", "**Ready to merge?** No", ""])
    return "\n".join(parts)


def build_run(
    root: str,
    template: str,
    run_id: str,
    report: str | None,
    status: str = "pass",
    other_agent: str | None = None,
) -> str:
    """One synthetic quorum run directory.

    :param root: The directory the run is built under.
    :param template: The fixture checkout to copy in as ``coding-agent-workdir``.
    :param run_id: The run directory's name.
    :param report: The reviewer's report, or ``None`` for a run with no
        reviewer subagent transcript at all.
    :param status: The Gauntlet-Agent's own verdict.
    :param other_agent: The single assistant text of a second subagent
        transcript, for the runs that have one.
    :returns: The run directory's path.
    """

    run_dir = os.path.join(root, run_id)
    os.makedirs(run_dir)
    shutil.copytree(template, os.path.join(run_dir, WORKDIR))
    logs = os.path.join(run_dir, "home/.claude/projects/-fixture/session-1/subagents")
    if report is not None or other_agent is not None:
        os.makedirs(logs)
    if other_agent is not None:
        with open(os.path.join(logs, "agent-02.jsonl"), "w", encoding="utf-8") as handle:
            json.dump(
                {
                    "type": "assistant",
                    "isSidechain": True,
                    "message": {
                        "role": "assistant",
                        "content": [{"type": "text", "text": other_agent}],
                    },
                },
                handle,
            )
            handle.write("\n")
    if report is not None:
        records = [
            {"type": "user", "isSidechain": True, "message": {"role": "user", "content": "review"}},
            {
                "type": "assistant",
                "isSidechain": True,
                "message": {
                    "role": "assistant",
                    "content": [{"type": "text", "text": "Reading the diff now."}],
                },
            },
            {
                "type": "assistant",
                "isSidechain": True,
                "message": {
                    "role": "assistant",
                    "content": [{"type": "text", "text": report}],
                },
            },
            # The report is not always the transcript's last word, so the
            # selection has to be by severity section rather than by position.
            {
                "type": "assistant",
                "isSidechain": True,
                "message": {
                    "role": "assistant",
                    "content": [{"type": "text", "text": "Review complete."}],
                },
            },
        ]
        with open(os.path.join(logs, "agent-01.jsonl"), "w", encoding="utf-8") as handle:
            handle.writelines(json.dumps(record) + "\n" for record in records)
    results = os.path.join(run_dir, "gauntlet-agent/results", f"{run_id}_grader")
    os.makedirs(results)
    with open(os.path.join(results, "result.json"), "w", encoding="utf-8") as handle:
        json.dump(
            {
                "runId": run_id,
                "scenario": SCENARIO,
                "status": status,
                "summary": "synthetic grader verdict",
                "criteria": [
                    {
                        "criterion": "No Critical/Important finding against the six correct items",
                        "verdict": status,
                        "evidence": "synthetic evidence quote",
                    }
                ],
            },
            handle,
        )
    return run_dir


def write_launch_log(evidence_dir: str, arm: str, run_dir: str) -> None:
    """A launch log of the shape `resolve_arm` reads, naming one run.

    :param evidence_dir: The synthetic campaign directory.
    :param arm: The arm the log's name declares.
    :param run_dir: The run directory the log records.
    """

    logs = os.path.join(evidence_dir, "logs")
    os.makedirs(logs, exist_ok=True)
    name = f"{arm}-{SCENARIO}-p1.log"
    with open(os.path.join(logs, name), "w", encoding="utf-8") as handle:
        handle.write(f"arm={arm} scenario={SCENARIO} repeat=1 proc=p1 budget=default\n")
        handle.write(f"run-dir   {run_dir}\n")
        handle.write(f"DONE {arm} {SCENARIO} p1\n")


def write_sidecar(evidence_dir: str, run_dir: str, answers: dict[str, str] | None = None) -> None:
    """The analyst's sidecar for one run, filled in from the script's own template.

    Going through ``--proof-template`` is what proves the round trip: the keys
    the reader joins on are the keys the template printed.

    :param evidence_dir: The synthetic campaign directory.
    :param run_dir: The run the sidecar answers.
    :param answers: ``states_trigger`` by a substring of the finding's text;
        anything unlisted is answered ``yes``.
    """

    run_id = os.path.basename(run_dir)
    template = io.StringIO()
    print_proof_templates([run_dir], template, io.StringIO())
    lines = [line for line in template.getvalue().split("\n") if line and not line.startswith("#")]
    filled = [lines[0]]
    for line in lines[1:]:
        cells = line.split("\t")
        answer = "yes"
        for needle, value in (answers or {}).items():
            if needle in cells[4]:
                answer = value
        cells[3] = answer
        filled.append("\t".join(cells))
    with open(os.path.join(evidence_dir, f"{run_id}-proof.tsv"), "w", encoding="utf-8") as handle:
        handle.write("\n".join(filled) + "\n")


def measure(
    run_dirs: list[str], evidence_dir: str, arm: str | None = "treatment"
) -> tuple[int, list[dict[str, str]], list[str]]:
    """Run the measuring path in process. (exit code, rows as dicts, stderr lines)."""

    out, err = io.StringIO(), io.StringIO()
    code = run_measure(run_dirs, evidence_dir, arm, out, err)
    lines = out.getvalue().rstrip("\n").split("\n")
    rows: list[dict[str, str]] = [
        dict(zip(COLUMNS, line.split("\t"))) for line in lines[1:] if line
    ]
    return code, rows, [line for line in err.getvalue().rstrip("\n").split("\n") if line]


def expect(row: dict[str, str], **expected: object) -> str:
    """The first column of a row that is not what the case expects, as a problem string."""

    for column, want in expected.items():
        got = row.get(column)
        if got != str(want):
            return f"{column} is {got!r}, expected {str(want)!r}"
    return ""


def self_test() -> int:
    """Every case of the brief, plus the sidecar and arm resolutions it does not reach.

    Each case builds a synthetic run whose fixture is the real one, so the line
    numbers the cases cite are the fixture's own.

    :returns: 0 when every case passed, 1 otherwise.
    """

    failures: list[str] = []

    def case(name: str, body: Callable[[], str]) -> None:
        try:
            problem = body()
        except Exception as error:  # noqa: BLE001 - a broken reading is a failure, not a crash
            problem = f"{type(error).__name__}: {error}"
        if problem:
            print(f"SELF-TEST FAILURE ({name}): {problem}")
            failures.append(name)
        else:
            print(f"passed as expected ({name})")

    with tempfile.TemporaryDirectory() as root:
        template = build_fixture(root)
        evidence = os.path.join(root, "evidence")
        os.makedirs(evidence)
        counter = [0]

        def run(
            report: str | None,
            status: str = "pass",
            sidecar: bool = True,
            other: str | None = None,
        ) -> str:
            """One synthetic run with its sidecar, named for the case that built it."""

            counter[0] += 1
            run_id = f"{SCENARIO}-claude-auto-2026092{counter[0] % 10}T000000Z-{counter[0]:04d}"
            run_dir = build_run(
                os.path.join(root, "runs"), template, run_id, report, status, other
            )
            if sidecar and report is not None:
                write_sidecar(evidence, run_dir)
            return run_dir

        os.makedirs(os.path.join(root, "runs"), exist_ok=True)

        def perfect() -> str:
            # No --arm: the row's arm has to come from a launch log, the way it
            # will in the campaign.
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING]))
            write_launch_log(evidence, "treatment", run_dir)
            code, rows, notes = measure([run_dir], evidence, None)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                arm="treatment",
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_complete=2,
                proof_total=2,
                grader_verdict="pass",
                accepted="yes",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            if notes != ["disagreements", "(none)"]:
                return f"unexpected disagreements block {notes}"
            # The join key is the sidecar's contract, so it is recomputed here
            # rather than taken from the script that wrote the sidecar.
            expected = hashlib.sha256(
                " ".join(OFFSET_FINDING.split()).encode("utf-8")
            ).hexdigest()[:12]
            findings = parse_report(report_text(run_dir), resolve_ranges(run_dir))
            keys = [f.key for f in findings]
            if expected not in keys:
                return f"the offset finding's key {expected} is not among {keys}"
            return ""

        def recall_one() -> str:
            run_dir = run(build_report([OFFSET_FINDING], []))
            code, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(rows[0], recall=1, proof_total=1, accepted="no") or (
                "" if code == 0 else f"exit {code}, expected 0"
            )

        def recall_zero() -> str:
            # Also the grader-disagreement case: the grader says pass, the count
            # says no, and the count governs. And the no-blocking-findings case:
            # a review that asks the analyst nothing owes no sidecar, so the run
            # is fully measured without one.
            run_dir = run(build_report([], [], [MINOR_RETRY_FINDING]), sidecar=False)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=0,
                blocking_on_clean=0,
                proof_complete=0,
                proof_total=0,
                accepted="no",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0 (a disagreement is a reading, not a failure)"
            if not any("\tgrader-disagreement\t" in note for note in notes):
                return f"no grader-disagreement line in {notes}"
            return ""

        def blocking_by_line() -> str:
            run_dir = run(
                build_report([OFFSET_FINDING], [SAVE_FINDING_BY_LINE, RETRY_FINDING]),
                status="fail",
            )
            _, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=2,
                blocking_on_clean=1,
                clean_hunks_hit="with_retry",
                proof_total=3,
                accepted="no",
            )

        def blocking_by_name() -> str:
            run_dir = run(
                build_report([OFFSET_FINDING, PARSE_FINDING], [SAVE_FINDING]), status="fail"
            )
            _, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=2,
                blocking_on_clean=1,
                clean_hunks_hit="parse_order_id",
                accepted="no",
            )

        def minor_on_clean() -> str:
            run_dir = run(
                build_report([OFFSET_FINDING], [SAVE_FINDING], [MINOR_RETRY_FINDING])
            )
            _, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=2,
                accepted="yes",
            )

        def test_coverage_excluded() -> str:
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING, COVERAGE_FINDING]))
            code, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=3,
                accepted="yes",
            ) or ("" if code == 0 else f"exit {code}, expected 0")

        def test_coverage_on_clean_hunk() -> str:
            # The exclusion where it is load-bearing: the coverage finding is
            # placed inside `withRetry` by its own citation, so only rule 3
            # keeps it out of blocking_on_clean.
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING, COVERAGE_FINDING_ON_HUNK]))
            code, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=3,
                accepted="yes",
            ) or ("" if code == 0 else f"exit {code}, expected 0")

        def unattributed_finding() -> str:
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING, UNATTRIBUTED_FINDING]))
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=3,
                accepted="yes",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0: an unattributed finding is a reading"
            if not any("\tunattributed\t" in note for note in notes):
                return f"the finding was not reported for adjudication: {notes}"
            return ""

        def span_over_bug_and_hunk() -> str:
            run_dir = run(build_report([SPAN_FINDING], [SAVE_FINDING]))
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=2,
                accepted="yes",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0: an ambiguous span is a reading"
            # Bug-first precedence decided this one, so it says so.
            ambiguous = [
                note
                for note in notes
                if "\tspan-ambiguous\t" in note
                and "covers offset_bug, log_rethrow" in note
                and "counted as offset_bug" in note
            ]
            if len(ambiguous) != 1:
                return f"the span was placed without a trace: {notes}"
            return ""

        def whole_file_span() -> str:
            # One content-free finding that cites the whole file reaches both
            # planted lines. The count stands, and the analyst is told what it
            # was read from.
            run_dir = run(build_report([WHOLE_FILE_FINDING], []))
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=1,
                accepted="yes",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            if not any("\tspan-ambiguous\t" in note for note in notes):
                return f"full recall from one whole-file citation, with no trace: {notes}"
            return ""

        def name_table_prose() -> str:
            # Ordinary English that names no region: the server clock, an
            # undeterministic timestamp, a catch arm with nothing to log. Each
            # one used to land on a clean hunk through a case-folded name.
            run_dir = run(
                build_report(
                    [OFFSET_FINDING],
                    [SAVE_FINDING, CLOCK_FINDING, CLOCK_PROSE_FINDING, RETHROW_PROSE_FINDING],
                )
            )
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=5,
                accepted="yes",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            unplaced = [note for note in notes if "\tunattributed\t" in note]
            if len(unplaced) != 3:
                return f"expected the three prose findings to be adjudicated, got {notes}"
            return ""

        def clean_hunk_named_but_unplaceable() -> str:
            # A line this script cannot place, plus the name of a clean hunk,
            # is rule 4's case and not a precision failure: `config.json` is
            # not one of the six hunks, and an import line is in no range.
            run_dir = run(
                build_report([OFFSET_FINDING], [SAVE_FINDING, CONFIG_JSON_FINDING, IMPORT_NIT_FINDING])
            )
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=4,
                accepted="yes",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            unplaced = [note for note in notes if "\tunattributed\t" in note]
            if len(unplaced) != 2:
                return f"expected both nits to be adjudicated, got {notes}"
            return ""

        def unnumbered_bullets() -> str:
            # A section that numbers nothing, with the sub-bullets the AC asks
            # for. Two findings, not six: the coverage finding has to keep its
            # own citation, or rule 3 stops excluding it.
            run_dir = run(
                build_report([OFFSET_FINDING], [BULLET_SAVE_FINDING, BULLET_COVERAGE_FINDING])
            )
            code, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=3,
                accepted="yes",
            ) or ("" if code == 0 else f"exit {code}, expected 0")

        def two_clean_hunks() -> str:
            run_dir = run(
                build_report(
                    [OFFSET_FINDING], [SAVE_FINDING, CONFIG_FINDING, STORE_FINDING]
                ),
                status="fail",
            )
            _, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=2,
                blocking_on_clean=2,
                clean_hunks_hit="config_readfile,store_slice",
                proof_total=4,
                accepted="no",
            )

        def proof_partial() -> str:
            run_dir = run(build_report([OFFSET_FINDING, SAVE_FINDING_NO_LINE], []))
            _, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(rows[0], recall=2, proof_complete=1, proof_total=2, accepted="yes")

        def proof_trigger_answers_read() -> str:
            # Both findings cite a line, so cites_line alone would count two.
            # The analyst's column is what makes it one -- and `YES` is that
            # column answered, not a malformed sidecar.
            run_dir = run(
                build_report([OFFSET_FINDING], [SAVE_FINDING_BY_LINE]), sidecar=False
            )
            write_sidecar(
                evidence,
                run_dir,
                {"Pagination offset": "no", "The write is never awaited": "YES"},
            )
            code, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0], recall=2, proof_complete=1, proof_total=2, accepted="yes"
            ) or ("" if code == 0 else f"exit {code}, expected 0")

        def no_subagent_log() -> str:
            good = run(build_report([OFFSET_FINDING], [SAVE_FINDING]))
            bare = run(None)
            code, rows, notes = measure([bare, good], evidence)
            if len(rows) != 1 or rows[0]["run_id"] != os.path.basename(good):
                return f"{len(rows)} rows, expected the good run's alone"
            if code == 0:
                return "exit 0, expected non-zero"
            wanted = [
                note
                for note in notes
                if note.startswith(os.path.basename(bare))
                and "\tno-subagent-report\t" in note
                and "no reviewer subagent report" in note
            ]
            if len(wanted) != 1:
                return f"no 'no reviewer subagent report' line in {notes}"
            return ""

        def fenced_heading_not_a_report() -> str:
            # A second transcript that only quotes the report's heading inside
            # a fence. Reading it as a second candidate report would void a run
            # that has exactly one.
            run_dir = run(
                build_report([OFFSET_FINDING], [SAVE_FINDING]), other=QUOTING_TRANSCRIPT
            )
            code, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(rows[0], recall=2, blocking_on_clean=0, proof_total=2) or (
                "" if code == 0 else f"exit {code}, expected 0"
            )

        def proof_sidecar_missing() -> str:
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING]), sidecar=False)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_complete=UNKNOWN,
                proof_total=2,
                accepted="yes",
            )
            if problem:
                return problem
            if code == 0:
                return "exit 0, expected non-zero"
            if not any("\tproof-sidecar-missing\t" in note for note in notes):
                return f"no proof-sidecar-missing line in {notes}"
            return ""

        def proof_sidecar_invalid() -> str:
            # A sidecar that answers something other than yes/no, and one that
            # does not answer every finding of the report. Reading either as a
            # number would be reporting a judgement the analyst never made --
            # but recall and blocking_on_clean do not come from the sidecar, so
            # the rows survive with proof_complete unknown and the exit is
            # still non-zero.
            unanswerable = run(build_report([OFFSET_FINDING], [SAVE_FINDING]), sidecar=False)
            write_sidecar(evidence, unanswerable, {"Pagination offset": "maybe"})
            short = run(build_report([OFFSET_FINDING], [SAVE_FINDING]), sidecar=False)
            write_sidecar(evidence, short)
            path = os.path.join(evidence, f"{os.path.basename(short)}-proof.tsv")
            with open(path, encoding="utf-8") as handle:
                kept = handle.read().rstrip("\n").split("\n")[:-1]
            with open(path, "w", encoding="utf-8") as handle:
                handle.write("\n".join(kept) + "\n")
            code, rows, notes = measure([unanswerable, short], evidence)
            if len(rows) != 2:
                return f"{len(rows)} rows, expected 2"
            for row in rows:
                problem = expect(
                    row,
                    recall=2,
                    blocking_on_clean=0,
                    proof_complete=UNKNOWN,
                    proof_total=2,
                    accepted="yes",
                )
                if problem:
                    return problem
            if code == 0:
                return "exit 0, expected non-zero"
            invalid = [note for note in notes if "\tproof-sidecar-invalid\t" in note]
            if len(invalid) != 2:
                return f"expected two proof-sidecar-invalid lines, got {notes}"
            return ""

        def grader_unreadable() -> str:
            # The verdict this script cannot read is a disagreement the analyst
            # settles, not a silent `-` in the column beside a count that
            # happens to say no.
            run_dir = run(build_report([OFFSET_FINDING], []))
            for result in glob.glob(os.path.join(run_dir, RESULT_GLOB)):
                with open(result, "w", encoding="utf-8") as handle:
                    handle.write("{not json")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(rows[0], recall=1, grader_verdict=UNKNOWN, accepted="no")
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            if not any("\tgrader-disagreement\t" in note for note in notes):
                return f"an unreadable verdict passed silently: {notes}"
            return ""

        def bad_run_dir() -> str:
            # A mistyped path is not a fixture problem, and Task 18 greps the
            # token.
            good = run(build_report([OFFSET_FINDING], [SAVE_FINDING]))
            missing = os.path.join(root, "runs", "no-such-run")
            code, rows, notes = measure([missing, good], evidence)
            if len(rows) != 1 or rows[0]["run_id"] != os.path.basename(good):
                return f"{len(rows)} rows, expected the good run's alone"
            if code == 0:
                return "exit 0, expected non-zero"
            if not any("\trun-dir-missing\t" in note for note in notes):
                return f"no run-dir-missing line in {notes}"
            return ""

        def arm_invalid() -> str:
            # Through `main`, so the check is pinned where it runs and not
            # only in the helper. It refuses before any run is read, so the
            # path argument is never touched.
            argv = sys.argv
            sys.argv = ["measure-code-review-precision.py", "--arm", "treatmnet", "/nonexistent"]
            try:
                main()
            except DesignError:
                pass
            else:
                return "--arm treatmnet was accepted into the column Task 18 groups by"
            finally:
                sys.argv = argv
            return "" if check_arm("treatment") == "treatment" else "--arm treatment refused"

        def arm_unresolved() -> str:
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING]))
            code, rows, notes = measure([run_dir], evidence, None)
            if rows:
                return f"{len(rows)} rows, expected none: the arm is unknown"
            if code == 0:
                return "exit 0, expected non-zero"
            if not any("\tarm-unresolved\t" in note for note in notes):
                return f"no arm-unresolved line in {notes}"
            return ""

        for name, body in (
            ("perfect", perfect),
            ("recall_one", recall_one),
            ("recall_zero", recall_zero),
            ("blocking_by_line", blocking_by_line),
            ("blocking_by_name", blocking_by_name),
            ("minor_on_clean", minor_on_clean),
            ("test_coverage_excluded", test_coverage_excluded),
            ("test_coverage_on_clean_hunk", test_coverage_on_clean_hunk),
            ("unattributed_finding", unattributed_finding),
            ("span_over_bug_and_hunk", span_over_bug_and_hunk),
            ("whole_file_span", whole_file_span),
            ("name_table_prose", name_table_prose),
            ("clean_hunk_named_but_unplaceable", clean_hunk_named_but_unplaceable),
            ("unnumbered_bullets", unnumbered_bullets),
            ("two_clean_hunks", two_clean_hunks),
            ("proof_partial", proof_partial),
            ("proof_trigger_answers_read", proof_trigger_answers_read),
            ("no_subagent_log", no_subagent_log),
            ("fenced_heading_not_a_report", fenced_heading_not_a_report),
            ("proof_sidecar_missing", proof_sidecar_missing),
            ("proof_sidecar_invalid", proof_sidecar_invalid),
            ("grader_unreadable", grader_unreadable),
            ("bad_run_dir", bad_run_dir),
            ("arm_unresolved", arm_unresolved),
            ("arm_invalid", arm_invalid),
        ):
            case(name, body)

    if failures:
        print(f"SELF-TEST FAILED: {len(failures)} case(s): {', '.join(failures)}")
        return 1
    print("self-test passed: every case classified as the brief specifies")
    return 0


def main() -> int:
    """Dispatch the three modes.

    :returns: The process exit status.
    :raises DesignError: When the arguments are not one of the three forms.
    """

    argv = sys.argv[1:]
    if argv and argv[0] == "--self-test":
        return self_test()
    if argv and argv[0] == "--proof-template":
        if len(argv) < 2:
            raise DesignError(USAGE)
        return print_proof_templates(argv[1:], sys.stdout, sys.stderr)
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
