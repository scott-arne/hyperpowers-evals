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
``scaffolding-skipped``
    A column-0 bullet ahead of a severity section's first finding was read as
    the section's own scaffolding and not counted. A finding titled with a
    bold clause is written the same way, so the line is quoted for the analyst
    rather than dropped in silence.
``heading-folded``
    A heading inside a Critical or Important finding was read as part of that
    finding rather than as the start of another. A real finding titled with a
    heading in a section titled in bold is written the same way as a
    subsection of the finding above it, and correcting the fold would invent
    findings out of the subsections, so the count stands and the heading is
    quoted for the analyst.
``citation-conflict``
    A Critical or Important finding was placed by its citations in one region
    while it names a region those citations do not cover. A cited line is the
    reviewer's own statement of where the defect is, and a remediation line
    citing the test to write is written the same way as one citing the defect,
    so the placement stands and the region it contradicts is quoted for the
    analyst.
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
above except ``unattributed``, ``span-ambiguous``, ``grader-disagreement``,
``scaffolding-skipped``, ``heading-folded`` and ``citation-conflict``, which are
readings for the analyst rather than instrument failures. A run that fails
emits no row; the other runs still do.

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
# Copied from analyze.py rather than imported, as LOG_RE and RUN_DIR_RE are.
# The arm is what the campaign's comparison is between, so a log the canonical
# analyzer refuses must not be read here as an answer: the two instruments
# would then disagree about which arm a trial was in, and the disagreement
# would be invisible. `budget=(default)` is literal there and here -- the
# campaign has one budget, and a log recording another is not one of its runs.
HEADER_RE = re.compile(
    r"^arm=(\S+) scenario=(\S+) repeat=(\d+) proc=(\S+) budget=(default)$",
    re.MULTILINE,
)
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
# Every region, bugs before hunks: the order the columns are read in.
ALL_KEYS = BUG_KEYS + HUNK_KEYS
# The owning identifiers of each region, for a finding that cites no line this
# script can place. They are deliberately narrow: an identifier that also names
# another region would move a finding from one column to another, and an
# unattributed finding is reported for adjudication rather than lost. `[\s\S]`
# rather than `.` because a finding is a multi-line block.
#
# Case matters, so no pattern below carries `re.IGNORECASE`. The fixture's
# identifiers are camelCase or SHOUTED (`withRetry`, `CLOCK`, `ORDER_ID`) and
# folding case turns each of them into an ordinary English word a review of
# this diff is likely to use: "the server clock", "the orders", "retry the
# request". Only the alternatives that are prose rather than code are folded,
# one at a time, with `(?i:...)`. Three alternatives were dropped outright for
# naming two regions at once: `\bseeded\b` (any setup, not just `seed()`),
# `\brethrow\b` (`withRetry` rethrows `lastErr` as well as the `catch` arm
# `log_rethrow` is), and `\bconfig\.json\b` (the committed data file is part of
# the diff but is not the `readFileSync` hunk).
# The table is in two tiers, and the more specific one decides alone. Every
# alternative of IDENTIFIERS is a token the fixture itself contains -- an
# identifier, a filename, or a string literal of the reviewed code -- so a
# finding matching one is quoting the diff. That is a claim about the pattern
# as well as about the token: an alternative spelled in ordinary words has to
# match the quoting rather than the words, or it silently rejoins the tier
# below. `list failed` is the `log.error` message, but bare it also matches
# "the list failed to paginate", which placed a correct pagination finding on
# the `catch` arm -- recall down and blocking_on_clean up from one sentence.
# `page * size` is a multiplication, but with the spacing left free it also
# matches the emphasis in "the page *size* is never validated". Every
# alternative of PROSE is ordinary English a reviewer could write about any
# code at all. A finding saying "retry count is off by one in `withRetry`"
# names one region and describes it in words that read like another; the
# region it names is the one it is about. Reading it the other way scored a
# clean-hunk finding as a planted bug: recall up, `blocking_on_clean` down,
# `accepted` flipped in the direction that flatters the treatment.
IDENTIFIERS: dict[str, re.Pattern[str]] = {
    "offset_bug": re.compile(
        # Spaced on both sides or on neither: `page *size*` and `*page* size`
        # are a reviewer emphasising a word, not quoting the multiplication.
        r"page(?:\*|\s+\*\s+)size"
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
    # `list failed` is the message string of the `log.error` call itself, and
    # the quotes are what say so: a finding writing it backticked or quoted is
    # quoting the catch arm, where one writing "the list failed with a 500" is
    # describing a symptom of any handler at all.
    "log_rethrow": re.compile(r"\blog\.error\b|[\"'`]list failed[\"'`]"),
    "test_fixture": re.compile(r"\bCLOCK\b|Date\.UTC|\bseed\(\)|handlers\.test\.js"),
}
# The generic-word alternatives, consulted only when no region is named. A
# region absent here can be placed by its identifiers alone, which is the
# conservative direction: the finding goes to the analyst rather than to a
# column this script guessed.
PROSE: dict[str, re.Pattern[str]] = {
    "offset_bug": re.compile(r"(?i:off[\s-]?by[\s-]?one)"),
    "log_rethrow": re.compile(r"(?i:\blogs?[\s-]and[\s-]re-?throws?\b)"),
    "test_fixture": re.compile(r"(?i:\bfixed clock\b|\bhard-?coded (?:test )?fixture\b)"),
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
#
# The number may carry one upper-case severity letter before its digits --
# `**C1. ...**`, `**I3. ...**`, `**M2) ...`, `C1. **...` -- because three of
# the Phase 5 reports (`9a6c`, `d2e2`, `1c6a`) number their findings by
# section that way, and read as no number at all each such section had content
# and no finding. Only C, I and M, the three severities' initials, and only
# directly before the digits: the number still ends in `.` or `)`.
NUMBERED_RE = re.compile(r"^\s{0,3}(?:\*\*\s*[CIM]?\d+[.)]|[CIM]?\d+[.)]\s+\*\*)")
BULLET_RE = re.compile(r"^[-*+]\s+\*\*")
# The bulleted form of a finding: the whole line bolded, title and citation
# together, which is how the numbered form titles one too. A bullet whose bold
# run ends and leaves a sentence running on after it is a label -- `- **Fix:**
# restore the guard`, `- **Input:** a request with page=1` -- and the reports
# use those to structure a finding, not to open one. Built from BULLET_RE so
# the column-0 anchor is stated once. BULLET_TITLE_RE below narrows the label
# reading for a section that numbers nothing.
BULLET_FINDING_RE = re.compile(BULLET_RE.pattern + r".+\*\*\s*$")
# A label-shaped bullet's opening bold run, as group 1. In a section that
# numbers nothing the run is a title, and the bullet opens a finding, unless
# its text ends in a colon: five Phase 5 reports (`a856`, `9a6c`, `d2e2`,
# `720d`, `b93e`) write every Minor finding as a bold-titled bullet --
# `- **`src/util.js:23`** -- ...`, `- **No documentation.** ...` -- and read as
# labels each such section had content and no finding. The colon is what the labels a finding structures
# itself with end in -- `- **Fix:**`, `- **Input:**` -- so those stay
# scaffolding. A section that numbers any finding gains no start from this:
# its column-0 bullets are the ones inside its numbered findings.
BULLET_TITLE_RE = re.compile(BULLET_RE.pattern + r"(.+?)\*\*")
# The heading form of a finding title: a heading whose text opens with the
# number the numbered form carries, bolded or not. Only a numbered heading can
# title a finding. An unnumbered heading inside a finding list is a subsection
# -- `#### Suggested test`, `##### Suggested fix` -- and reading one as a title
# invented a blocking finding on a clean hunk with no note to say so. The number
# has to end in `.` or `)` and a space, so `#### 1.5x slower` stays prose. It
# may carry the severity letter NUMBERED_RE allows, because `a856` titles its
# findings `#### C1. ...` and `#### I1. ...`. Group 1 is the `#` run, as in
# HEADING_RE, so depth reads the same off either.
TITLE_HEADING_RE = re.compile(r"^\s{0,3}(#{1,6})\s+(?:\*\*\s*)?[CIM]?\d+[.)](?:\*\*)?\s")
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
    # The regions this finding named at one tier, when there was more than one
    # and no citation settled it. The analyst gets the candidates by name.
    contested: tuple[str, ...] = ()
    # The one region this finding named, when rule 4 put it out of scope for a
    # finding whose citation landed in no range. Named for the analyst too:
    # the reviewer did say where to look, and this script declined to follow.
    blocked: tuple[str, ...] = ()
    # The headings read as this finding's prose, as written. See :func:`split_findings`.
    folded: tuple[str, ...] = ()
    # The regions it names that the citations placing it miss. See :func:`citation_conflict`.
    conflict: tuple[str, ...] = ()


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

    The start pattern must match exactly one line, as a bug's pattern must:
    two matches mean the fixture has grown a second place this hunk could
    begin, and taking the first would move the range under a measurement that
    is built on the ranges not moving silently. The END pattern keeps its
    "first match after the start" reading -- ``log_rethrow`` ends at a bare
    ``}``, which closes most of the file's blocks.

    :param key: The hunk key.
    :param path: The fixture-relative path, for the error message.
    :param blob: The file's contents at ``HEAD``.
    :param start_pat: The regex matching the hunk's first line.
    :param end_pat: The regex matching the first line after the hunk.
    :returns: The located span.
    :raises RunError: When the start matches other than once, or the end does
        not resolve.
    """

    lines = blob.split("\n")
    start = re.compile(start_pat)
    end = re.compile(end_pat)
    starts = [n for n, line in enumerate(lines, 1) if start.search(line)]
    if len(starts) != 1:
        raise RunError(
            "fixture-unresolved",
            f"{key}: {start_pat!r} matches {len(starts)} lines of {path} "
            f"({', '.join(str(n) for n in starts) or 'none'}), expected 1",
        )
    first = starts[0]
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
    """The report cut into (severity, body lines) at every heading but a nested one.

    Fenced code blocks are passed through untouched: a diff or a snippet inside
    a finding can contain lines that look like headings.

    A heading nested *under* a severity heading is the one exception, and it
    exists because ending the section there was a silent wrong number. A report
    that opens ``### Critical`` and titles each finding ``#### 1. ...`` closed
    the Critical section on an empty body and dropped every finding into a
    severity-"" section the readers skip: two named, correctly cited findings
    measured as none, with nothing raised, because the severity sections
    genuinely existed. So a heading deeper than the one that opened the current
    severity section stays in its body.

    A heading at the same level or shallower is that section's sibling and
    still ends it, which is what keeps ``### Assessment`` -- the report talking
    about the change rather than reporting a defect -- from being read as a
    finding of the section above it.

    The bold label form (``**Critical**``) carries no heading level, so nothing
    can be nested under it and every heading ends it, exactly as before.
    Outside a severity section every heading breaks, also as before.

    :param report: The reviewer's report.
    :returns: One entry per section, in order.
    """

    sections: list[tuple[str, list[str]]] = []
    current = ""
    # The level of the heading that opened the current severity section, or
    # ``None`` when no heading did: outside a severity section, or inside one
    # the label form opened.
    depth: int | None = None
    body: list[str] = []
    fenced = False
    for line in report.split("\n"):
        if line.lstrip().startswith("```"):
            fenced = not fenced
            body.append(line)
            continue
        severity = None if fenced else severity_of(line)
        if severity is None:
            body.append(line)
            continue
        heading = HEADING_RE.match(line)
        if (
            not severity
            and current
            and depth is not None
            and heading is not None
            and len(heading.group(1)) > depth
        ):
            body.append(line)
            continue
        sections.append((current, body))
        current, body = severity, []
        depth = len(heading.group(1)) if severity and heading is not None else None
    sections.append((current, body))
    return sections


def split_findings(
    severity: str,
    body: list[str],
    skipped: list[str] | None = None,
    folded: list[list[str]] | None = None,
) -> list[str]:
    """One text block per finding of a severity section.

    Both list forms are read in one pass. Taking the first form that matched
    anything lost every finding written in the other one -- a section opening
    with a bulleted finding and continuing with numbered ones dropped the
    first outright, and `recall` read low with nothing said about it.

    A numbered heading is the third form: :func:`split_sections` leaves a
    heading in a section's body only where it is nested under that section's
    own heading, and a report that writes ``### Critical`` over ``#### 1. ...``
    is titling its findings. It is ranked with the numbered form because that
    is what it is -- the same numbered title written as a heading -- and
    because ranking it with the bulleted form would move ``opens``, which is
    the reading the four real reports that bullet inside a numbered finding
    depend on.

    A heading starts a finding only when three things hold, and each one
    closes a shape that invented a finding the reviewer never wrote. It is
    numbered: an unnumbered heading -- ``#### Suggested test``,
    ``##### Suggested fix`` -- is a subsection of the finding above it, and
    where it sits at the titles' own depth nothing but the number tells the
    two apart. The section opens with one: its first finding-shaped line is a
    numbered heading, not a bold or bulleted title, because a section titled
    in bold is not titling with headings and a numbered
    ``##### 1. Suggested test`` inside it is still a subsection. It sits at
    the finding-title depth: the shallowest numbered-heading depth in the
    body, taken in a pre-pass, so a numbered ``##### 1. Reproduce`` under a
    ``#### 1.`` title stays inside it. Asking only the last of the three, of
    every heading, made a lone subsection in a bold-titled section the
    shallowest heading there and so a title. Where such a subsection cited a
    clean hunk of the fixture the invented finding attributed there, raised
    ``blocking_on_clean`` and flipped ``accepted``; paired with the failing
    grader a report concluding "not ready to merge" comes with, nothing
    disagreed and the wrong number reached the campaign unannounced.

    Every other heading is prose: after a finding opens it folds into that
    finding with the lines around it, and ahead of the first finding it is
    content the section refuses, as described below. A fold is reported
    through ``folded``, because form alone cannot tell a mixed-in finding from
    a subsection: a real finding titled ``#### 2. ...`` after a bold
    ``**1. ...**`` is written exactly as the subsections above are, and folded
    it can hand the finding above a citation that moves ``recall`` or
    ``blocking_on_clean``. Correcting the fold would invent findings out of
    the subsections again, so the count keeps the reading and the analyst is
    told.

    The union is asymmetric on purpose: a bulleted line begins a finding only
    while no numbered finding has begun. 4 of the 7 real reviewer reports
    write column-0 bullets *inside* a numbered finding -- an ``- **Input:**``
    label, a bolded claim -- and reading those as starts would cut one finding
    into three and separate its citation from its text. In none of them does
    such a bullet appear before the first numbered start.

    A bullet opens a finding only when it is written like one, whichever side
    of that boundary it falls: bolded end to end, the way every finding of
    every observed report is titled. A bold label with the sentence trailing
    after it is the report talking about its own list, and counting one as a
    finding read ``proof_total`` high and queued a line about nothing for the
    analyst.

    Where the section numbers nothing, a bullet also opens a finding when its
    opening bold run is a title rather than a label: five Phase 5 reports write
    every Minor finding as a bold title with its prose running on after it,
    and read as labels each such section had content and no finding. The run
    is a label, and stays scaffolding, when its text ends in a colon, as
    ``- **Fix:**`` and ``- **Input:**`` do. A section that numbers any finding
    gains no start from this, ahead of its first number or below it.

    What a section may carry ahead of its first finding is therefore narrow
    but not empty: a fence, because reviewers quote the code they are about to
    fault, and a bullet in that scaffolding shape. Anything else -- a
    paragraph, an unbolded bullet -- may be a finding written in a form this
    script does not read, and dropping it silently is the defect the fatal
    exists for. None of the seven real reports carries any of the three.

    A heading that titles no finding, written before the first start, lands
    there as well: it sits inside no finding either, so it is content in
    neither list form. So does a section that titles its findings with
    unnumbered headings, which is refused rather than guessed at: nothing in
    such a title tells it from a subsection, and none of the seven real
    reports titles its findings with headings of any kind. Refusing rather
    than dropping is the same fail-closed reading, arrived at deliberately and
    not as a side effect of the rule above.

    A skipped bullet is reported through ``skipped`` because the label shape is
    also how a reviewer titles a real finding with the sentence trailing after
    the colon: the two are one line, no rule can keep one and drop the other,
    and the reading that leaves the real reports right is the one that drops
    both. Reporting it is what keeps that trade from being a silent wrong
    number. A fence is not reported -- it is unambiguously quoted code, and a
    note on every quoted snippet is one the analyst learns to skip.

    :param severity: The section's severity, for the error message.
    :param body: The section's lines.
    :param skipped: Receives each bullet this section skipped ahead of its
        first *numbered* finding -- every one of them where it numbers
        nothing, because there each is merged into the bullet above it
        instead. For the caller that wants them named for the analyst.
    :param folded: Receives one list per finding returned, in the same order:
        the heading lines outside a fence that the finding holds below its
        first line. A heading title is its finding's first line and is not
        among them.
    :returns: The findings' raw text blocks.
    :raises RunError: When the section holds content no finding accounts for,
        before the first one or in place of any.
    """

    # The finding-title depth, or 0 where headings title nothing here. The
    # section's first finding-shaped line decides whether it titles findings
    # with headings at all: one that opens with a bold or bulleted title is
    # not doing so, and a numbered heading later in it is a subsection, so its
    # depth is 0, which no heading has. Where it opens with a numbered heading
    # the depth is the shallowest numbered heading over the whole body, not
    # the first one's, so a deeper numbered heading written ahead of the first
    # title cannot set the depth and swallow the titles below it; it is
    # refused as content before the first finding instead. Fences are tracked
    # here as they are below, because a quoted diff holds lines that look like
    # headings and findings.
    depths: list[int] = []
    headed: bool | None = None
    quoted = False
    for line in body:
        if line.lstrip().startswith("```"):
            quoted = not quoted
            continue
        if quoted:
            continue
        title = TITLE_HEADING_RE.match(line)
        if title is not None:
            depths.append(len(title.group(1)))
        if headed is None and (
            title is not None or NUMBERED_RE.match(line) or BULLET_FINDING_RE.match(line)
        ):
            headed = title is not None
    title_depth = min(depths, default=0) if headed else 0
    numbered: list[int] = []
    bulleted: list[int] = []
    # The bullets read as the section's scaffolding rather than as starts.
    labels: list[int] = []
    # The labels among them whose opening bold run is a title. They become
    # starts only where the section numbers nothing; see BULLET_TITLE_RE.
    titled: list[int] = []
    # The lines ahead of a first finding that the section itself accounts for.
    accounted: set[int] = set()
    # Every heading outside a fence, taken before the branches below because a
    # heading that titles nothing folds whichever of them reads it.
    headings: list[int] = []
    fenced = False
    scaffold = False
    for index, line in enumerate(body):
        if not fenced and HEADING_RE.match(line):
            headings.append(index)
        if line.lstrip().startswith("```"):
            fenced = not fenced
            accounted.add(index)
            continue
        if fenced:
            accounted.add(index)
            continue
        heading = TITLE_HEADING_RE.match(line)
        if heading is not None and len(heading.group(1)) == title_depth:
            # A numbered heading at the finding-title depth, in a section that
            # opens with one, is how the reports that write it title a
            # finding. Ranked with the numbered starts so `opens` and `starts`
            # below keep their present meaning. Any other heading -- one with
            # no number, one deeper than the titles, any in a section titled
            # in bold or by bullets -- is a subsection of the finding above
            # it, and reading it as a sibling invented a blocking finding on a
            # clean hunk with no note to say so. It falls through to the
            # branches below and is handled as the prose it sits among.
            numbered.append(index)
            scaffold = False
        elif NUMBERED_RE.match(line):
            numbered.append(index)
            scaffold = False
        elif BULLET_FINDING_RE.match(line):
            bulleted.append(index)
            scaffold = False
        elif BULLET_RE.match(line):
            accounted.add(index)
            scaffold = True
            labels.append(index)
            bold = BULLET_TITLE_RE.match(line)
            if bold is not None and not bold.group(1).rstrip().endswith(":"):
                titled.append(index)
        elif scaffold and (not line.strip() or line.startswith((" ", "\t"))):
            # A scaffolding bullet wraps; every observed report wraps at about
            # 80 columns, so its second line is part of it and not new content.
            accounted.add(index)
        else:
            scaffold = False
    if not numbered:
        # Decided after the pass because a number anywhere in the section
        # keeps every title-run bullet the scaffolding it was.
        bulleted.extend(titled)
        labels = [index for index in labels if index not in titled]
    opens = numbered[0] if numbered else len(body)
    starts = sorted(numbered + [index for index in bulleted if index < opens])

    def unaccounted(lines: list[str]) -> list[str]:
        return [line for line in lines if line.strip() and not EMPTY_SECTION_RE.match(line)]

    if not starts:
        # A section with no finding at all has nothing for a fence to be
        # quoted for or a label to introduce, so here everything counts: a
        # report whose findings this script cannot see is not a report of no
        # findings.
        content = unaccounted(body)
        if content:
            raise RunError(
                "report-unparsed",
                f"the {severity} section has content but no finding: {one_line(content[0], 80)}",
            )
        return []
    lead = unaccounted(
        [line for index, line in enumerate(body[: starts[0]]) if index not in accounted]
    )
    if lead:
        raise RunError(
            "report-unparsed",
            f"the {severity} section has content before its first finding, in neither "
            f"list form: {one_line(lead[0], 80)}",
        )
    if skipped is not None:
        # Against `opens`, not `starts[0]`: where the section numbers nothing,
        # its first bullet is the first start and every label below is merged
        # into the bullet above it. Reporting only what precedes the first
        # start left that merge silent, and `accepted` flipped on it.
        skipped.extend(body[index] for index in labels if index < opens)
    bounds = [*starts, len(body)]
    if folded is not None:
        # Strictly after the start: a title is where its finding begins, not a
        # heading the finding absorbed. A heading ahead of the first start
        # belongs to no finding and is left to the refusal above.
        folded.extend(
            [body[index] for index in headings if a < index < b]
            for a, b in itertools.pairwise(bounds)
        )
    return ["\n".join(body[a:b]) for a, b in itertools.pairwise(bounds)]


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


def name_candidates(text: str) -> tuple[str, ...]:
    """The regions one finding names, at the most specific tier that names any.

    A region named by an identifier of the fixture beats one matched through
    ordinary English, whether the loser is a planted bug or a clean hunk:
    :data:`IDENTIFIERS` is consulted first and :data:`PROSE` only when it
    returns nothing. Within a tier there is no precedence at all -- two
    candidates there are two regions the reviewer could be writing about, and
    choosing one would be this script's guess rather than the reviewer's
    statement. :func:`attribute` sends that case to the analyst.

    Both tiers are read against every region, including the ones rule 4 holds
    out of scope for the finding being placed. Which regions this finding is
    allowed to land in is the caller's question; which regions it *names* is
    not, and answering both here let the restriction promote a weaker match:
    the named clean hunk dropped out of the identifier tier, the tier came up
    empty, and a prose alternative for a planted bug won uncontested below it.

    :param text: The finding's text.
    :returns: The named regions, bugs before hunks and hunks in :data:`HUNKS`
        order. More than one means the tier is contested.
    """

    for table in (IDENTIFIERS, PROSE):
        named = tuple(key for key in ALL_KEYS if key in table and table[key].search(text))
        if named:
            return named
    return ()


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
    line) has not, and is reported for adjudication instead. The restriction
    chooses among the regions the finding named; it does not send the reader
    down to a weaker tier. A cited finding naming a clean hunk in the
    fixture's own words has named a region this pass may not choose, which is
    not "named nothing": crediting it to a planted bug on an English phrase
    is the round-1 defect with one citation added to the text.

    A finding whose *citation* reaches a planted bug is attributed to the bug
    alone: reviewers cite the enclosing function or a span around the defect,
    and reading that as a blocking finding against the correct code the span
    also covers would invent a precision failure. :func:`span_ambiguity` says
    when that precedence was what decided the attribution. Bug-before-hunk is
    a tie-break for citations only; a finding placed by *name* is placed by
    :func:`name_candidates`, where a contested tier goes to the analyst rather
    than to the bug.

    When a finding's citations and the regions it names disagree, the citation
    still places it: form cannot tell a remediation line citing the test to
    write from a line citing the defect. :func:`citation_conflict` says so.

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
    named = name_candidates(text)
    allowed = BUG_KEYS if cited else ALL_KEYS
    return named if len(named) == 1 and named[0] in allowed else ()


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


def citation_conflict(text: str, ranges: dict[str, Span]) -> tuple[str, ...]:
    """The regions a finding names that the citations placing it do not cover.

    :func:`attribute` places a finding by its citations before it reads the
    names the finding uses, and that precedence stands: a cited line is the
    reviewer's own statement of where the defect is. It misreads a finding
    whose only in-range citation is not the defect's location. A Critical that
    names ``listOrdersHandler``, cites no line of it, and asks for a regression
    test at ``test/handlers.test.js:8`` was placed on ``test_fixture``:
    ``recall`` one low and ``blocking_on_clean`` one high, at exit 0 with
    nothing on stderr. Form cannot tell that citation from one that locates
    the defect, so the count keeps the citation and the name it contradicts is
    returned for the analyst.

    The test is a subset, not equality. A citation set covering the named
    region and another besides contradicts nothing, and its breadth is what
    :func:`span_ambiguity` reports. A finding whose citations land in no range
    was placed by its name, so there is no citation for the name to contradict.

    A citation is where the reviewer points, not a name the reviewer used, so
    every ``file:line`` citation is blanked before the names are read: read as
    a name, ``test/handlers.test.js:8`` is a ``test_fixture`` identifier, which
    outranks a bug named only in English and let the citation agree with
    itself. The blank is as long as the citation because ``offset_bug`` and
    ``unawaited_save`` pair a name with a keyword inside a 500-character
    window, and closing that gap could make a name the reviewer did not write.

    :param text: The finding's text.
    :param ranges: The resolved spans by key.
    :returns: The named regions its citations do not cover, in
        :func:`name_candidates` order, or empty when its citations placed
        nothing or cover every region it names.
    """

    cited = cited_spans(text)
    by_line = tuple(key for key in ALL_KEYS if covered(ranges[key], cited))
    if not by_line:
        return ()
    named = name_candidates(FILE_LINE_RE.sub(lambda m: " " * len(m.group()), text))
    return tuple(key for key in named if key not in by_line)


def parse_report(
    report: str,
    ranges: dict[str, Span] | None = None,
    skipped: list[tuple[str, str]] | None = None,
) -> list[Finding]:
    """Every severity-tagged finding of the report, attributed.

    :param report: The reviewer's report.
    :param ranges: The resolved spans by key, or ``None`` to skip attribution.
        The proof template needs each finding's severity, citation and text but
        not where it lands, so it can be printed for a run whose fixture this
        script does not know.
    :param skipped: Receives ``(severity, line)`` for every bullet a section
        skipped ahead of its first finding; see :func:`split_findings`.
    :returns: The findings, in report order.
    :raises RunError: When a severity section cannot be read.
    """

    findings: list[Finding] = []
    for severity, body in split_sections(report):
        if severity not in SEVERITIES:
            continue
        dropped: list[str] = []
        folds: list[list[str]] = []
        texts = split_findings(severity, body, dropped, folds)
        for text, folded in zip(texts, folds, strict=True):
            attributions = attribute(text, ranges) if ranges else ()
            # Only a finding that landed nowhere carries candidates, and a
            # lone candidate that did not place it is one rule 4 excluded:
            # :func:`attribute` returns any other single name.
            candidates = () if attributions or not ranges else name_candidates(text)
            findings.append(
                Finding(
                    severity=severity,
                    text=text,
                    key=finding_key(text),
                    cites_line=bool(FILE_LINE_RE.search(text)),
                    test_coverage=bool(TEST_COVERAGE_RE.search(text)),
                    attributions=attributions,
                    ambiguity=span_ambiguity(text, ranges) if ranges else "",
                    contested=candidates if len(candidates) > 1 else (),
                    blocked=candidates if len(candidates) == 1 else (),
                    folded=tuple(folded),
                    conflict=citation_conflict(text, ranges) if ranges else (),
                )
            )
        if skipped is not None:
            skipped.extend((severity, line) for line in dropped)
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
    skipped: list[tuple[str, str]] = []
    findings = parse_report(report_text(run_dir), ranges, skipped)
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
        Note(
            run_id,
            "unattributed",
            f"{f.severity} finding {f.key}: {one_line(f.text)}"
            + (f" [names {' and '.join(f.contested)}, neither settled]" if f.contested else "")
            + (
                f" [names {f.blocked[0]}; rule 4 does not place a cited finding "
                "on a clean hunk]"
                if f.blocked
                else ""
            ),
        )
        for f in graded
        if not f.attributions
    ]
    notes.extend(
        Note(run_id, "span-ambiguous", f"{f.severity} finding {f.key}: {f.ambiguity}")
        for f in graded
        if f.ambiguity
    )
    # The citation's placement stands, because it is the reviewer's own
    # statement of where to look and a remediation line citing the test to
    # write reads exactly like a line citing the defect; the name it contradicts
    # is quoted instead. Only for `graded`, from which every count is read.
    notes.extend(
        Note(
            run_id,
            "citation-conflict",
            f"{f.severity} finding {f.key}: placed by citation on "
            f"{' and '.join(f.attributions)} but names {' and '.join(f.conflict)}",
        )
        for f in graded
        if f.conflict
    )
    # The count did not change; what the count did not include is said out
    # loud, because a finding written as a bold clause reads exactly like the
    # scaffolding it was skipped as. Only where it could have changed, as for
    # both siblings above: every count is read from `graded`, so a bullet
    # skipped in a Minor section is a note on a trial nothing moved in.
    notes.extend(
        Note(
            run_id,
            "scaffolding-skipped",
            f"{severity} section, ahead of its first finding: {one_line(line)}",
        )
        for severity, line in skipped
        if severity in BLOCKING
    )
    # The count keeps the fold; a heading written as a real finding reads
    # exactly like the subsection it was folded as, so it is quoted. From
    # `graded` for the same reason as the siblings above.
    notes.extend(
        Note(
            run_id,
            "heading-folded",
            f"{f.severity} finding {f.key}: heading read as part of this finding: {one_line(line)}",
        )
        for f in graded
        for line in f.folded
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
# The same rule, with nothing else holding the finding back: one clean hunk,
# named unmistakably, beside a citation in no range. The two nits above are
# each saved from `blocking_on_clean` by something narrower -- one names no
# hunk at all, the other names two -- so rule 4 needs a case that turns on
# rule 4 alone.
READFILE_NIT_FINDING = """**6. The startup read deserves a comment - `config.json:4`**

`readFileSync` is the right call here, but nothing says the blocking read is
deliberate, so the next reader will wonder.
"""
# The unnumbered form, with the sub-bullets this scenario's AC asks reviewers
# to write. A bullet pattern that matched indented lines would read each of
# these as three findings and split the coverage finding away from its
# citation.
BULLET_SAVE_FINDING = """- **The write is never awaited - `src/handlers.js:37`**
  - **Input:** a create whose write rejects.
  - **Outcome:** the handler has already answered 201.
"""
# Its first sub-bullet is bolded end to end, which is the shape of a finding
# start: only the column-0 anchor keeps it a sub-bullet. A label-shaped
# sub-bullet would be held out by the bold rule as well, and then the anchor
# could rot without any case noticing.
BULLET_COVERAGE_FINDING = """- **No test covers the retry path**
  - **A first attempt that rejects is never exercised - `src/util.js:12`.**
  - **Outcome:** a regression in the backoff is invisible.
"""
# "Off by one" is ordinary English; `withRetry` and `parseOrderId` are names
# the fixture contains. Under a flat name table the prose alternative of
# `offset_bug` won, so a finding about a clean hunk scored as the planted
# pagination bug: recall up, blocking_on_clean down, `accepted` flipped in the
# direction that flatters the treatment.
RETRY_OFF_BY_ONE_FINDING = """**3. Retry count is off by one in `withRetry`**

The loop makes one more attempt than the constant names, so a caller that
budgets for three waits through four.
"""
PARSE_OFF_BY_ONE_FINDING = """**4. `parseOrderId` is off-by-one on the prefix length**

It slices from the wrong index, so an id one character longer than the prefix
is rejected as malformed.
"""
# Two regions named at the same specificity. Choosing either would be this
# script's guess, so the finding goes to the analyst with both named.
COLLISION_FINDING = """**3. The retry wrapper hides a lost write**

`withRetry` is called by `createOrderHandler` without `await`, so a failure
after the last attempt is never seen.
"""
# A section that opens in the bullet form and switches to the numbered form.
# Everything before the first numbered start used to be discarded outright, so
# this finding vanished with no token and recall read 1 for a report that found
# both planted bugs.
MIXED_BULLET_FINDING = """- **Pagination offset skips a whole page - `src/handlers.js:18`**
  Requesting `page=1, size=10` asks the store for rows from 10.
"""
# A numbered finding whose body carries its own column-0 bullets, one of them
# not a label. This is the shape 4 of the 7 real reviewer reports use, and a
# parser that read every column-0 bullet as a finding start would cut this one
# into three. The last bullet is bolded end to end -- the shape of a finding
# start -- so that only the numbered start's precedence keeps it inside this
# finding; with three label bullets the precedence could rot unnoticed.
GUARD_FINDING = """**1. Pagination offset skips a whole page - `src/handlers.js:18`**

- **Input:** a request with `page=1, size=10`.
- **No guard catches this.** The handler validates nothing before computing
  the offset, so the caller cannot tell a skipped page from an empty one.
- **Reject a request whose page is below 1.**
"""
# A finding in neither recognized form, ahead of one in the numbered form.
# Dropping it silently is what this must not do.
UNRECOGNIZED_LEAD_FINDING = """**Pagination offset skips a whole page - `src/handlers.js:18`**

The handler asks the store for rows from 10 on the first page.
"""
# The clean-hunk finding above with a citation two lines above the hunk -- an
# import line, a signature line, the blank line over the function. The citation
# reaches no region, so the name pass runs restricted to the planted bugs; the
# region this finding actually names is then out of scope, and reading that as
# "names nothing" credited it to the planted pagination bug on the words "off
# by one" alone.
RETRY_OFF_BY_ONE_CITED_FINDING = """**3. Retry count is off by one in `withRetry` - `src/util.js:3`**

The loop makes one more attempt than the constant names, so a caller that
budgets for three waits through four.
"""
# Reviewers quote the code they are about to fault before listing anything.
# The quoted lines are not a finding this script failed to read.
QUOTED_DIFF_LEAD = """```js
// src/handlers.js
const offset = page * size;
```
"""
# A note about the list, not about the code, in the report's own bullet form.
# Counting it as a finding reads `proof_total` one too high and asks the
# analyst to adjudicate a line that says nothing about the diff.
SECTION_PREAMBLE = """- **Note:** the findings below are ordered by severity, most
  serious first.
"""
# A real finding written in the preamble's shape: the title bolded, the sentence
# trailing after the colon. The two are one line to any rule that reads them, so
# the count skips both -- and says so, because this one is a finding.
CLAUSE_BULLET_FINDING = """- **Pagination is broken:** the handler skips the first page - `src/handlers.js:18`
"""
# The same clause shape naming a clean hunk, below a start rather than ahead of
# one. A section that numbers nothing has no later start for it to precede, so
# the count folds it into the bullet above and reads the two as one finding.
CLAUSE_BULLET_RETRY_FINDING = """- **Retry is off by one:** `withRetry` loops once too often - `src/util.js:12`
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
# The whole-report shapes, for the cases the finding blocks above cannot build:
# `build_report` writes one heading level for every severity, and what these
# three turn on is the level itself.
#
# A report that opens each severity with `###` and titles each finding with a
# deeper `####`. Both planted bugs are found, named and cited correctly; only
# the Markdown shape differs from the one `build_report` writes.
NESTED_HEADING_REPORT = """## Review: "paginate order listing and add order creation"

### Strengths

- **`src/util.js:7-20`** - `withRetry` is correct as written: three attempts,
  exponential backoff, rethrows after the last.

### Issues

### Critical

#### 1. Pagination offset skips a whole page - `src/handlers.js:18`

The offset is `page * limit` with a one-based `page`, so the first page
is never returned. Callers see records begin at the second page.

### Important

#### 1. The write is never awaited - `src/handlers.js:37`

`saveOrder` returns a promise that is dropped, so a failed write is
invisible to the handler and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# The same `###` severity heading with its finding numbered rather than
# titled by a heading, followed by a `###` sibling. The Assessment is the
# report talking about the change as a whole; it names no file and asks for
# nothing, so reading it as a finding of the section above would count the
# report's own closing prose as blocking.
SHALLOW_HEADING_REPORT = """## Review: "paginate order listing and add order creation"

### Critical

**1. Pagination offset skips a whole page - `src/handlers.js:18`**

- **Input:** a request with `page=1, size=10`.
- **Outcome:** the handler asks the store for rows from 10, so the first ten
  orders are never returned on the first page.

### Assessment

The change is close, but the defect above has to be fixed before it can land.
Nothing else here asks for a change.

**Ready to merge?** No
"""
# A severity section opened by the bold label form, which carries no heading
# level at all. There is no depth for a heading to be deeper than, so every
# heading ends it -- the reading this form has always had.
LABEL_SECTION_REPORT = """## Review: "paginate order listing and add order creation"

**Critical**

**1. Pagination offset skips a whole page - `src/handlers.js:18`**

- **Input:** a request with `page=1, size=10`.
- **Outcome:** the handler asks the store for rows from 10, so the first ten
  orders are never returned on the first page.

#### Assessment

The label names no level for this heading to be nested under, so it ends the
section rather than titling a finding in it.

**Ready to merge?** No
"""
# A heading-titled finding carrying the two column-0 bullet shapes the real
# reports write inside their numbered findings: a bold label with the sentence
# trailing after it, and a claim bolded end to end. Both belong to the finding
# above them, and what keeps them there is the heading start being ranked with
# the numbered form rather than the bulleted one.
NESTED_HEADING_WITH_BULLETS_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

#### 1. Pagination offset skips a whole page - `src/handlers.js:18`

- **Input:** a request with `page=1, size=10`.
- **The handler asks the store for rows from 10**

So the first ten orders are never returned on the first page.

### Important

#### 1. The write is never awaited - `src/handlers.js:37`

`saveOrder` returns a promise that is dropped, so a failed write is
invisible to the handler and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# Two heading-titled findings, the first carrying a `#####` remediation
# subsection that cites a CLEAN hunk. Reading that subsection as a third
# finding attributed it to `test_fixture` and invented a blocking-on-clean
# hit; with the failing grader this report's conclusion pairs with, nothing
# disagreed and the wrong number reached the campaign unannounced.
REMEDIATION_SUBHEADING_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

#### 1. Pagination offset skips a whole page - `src/handlers.js:18`

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

##### Suggested test - `test/handlers.test.js:8`

Add a case asserting that page 1 returns rows starting at offset 0.

#### 2. The write is never awaited - `src/handlers.js:37`

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# The same shape with the subsection citing and naming nothing: the report
# round 6's disclosure 7 documented, where the phantom finding landed in the
# disagreements block instead of on a clean hunk. One finding, not two.
SUGGESTED_FIX_SUBHEADING_REPORT = """## Review: "paginate order listing and add order creation"

### Critical

#### 1. Pagination offset skips a whole page - `src/handlers.js:18`

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

##### Suggested fix

Subtract one from the page index before multiplying by the page size.

### Assessment

**Ready to merge?** No
"""
# A `#####` aside ahead of the section's first `####` finding. It belongs to
# no finding, so it is content this script cannot read in the one place the
# section has no finding to hold it.
DEEPER_HEADING_LEAD_REPORT = """## Review: "paginate order listing and add order creation"

### Critical

##### Aside

A note about the review process that is not a finding at all.

#### 1. Pagination offset skips a whole page - `src/handlers.js:18`

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

### Assessment

**Ready to merge?** No
"""
# The remediation subsection of REMEDIATION_SUBHEADING_REPORT under findings
# titled in bold rather than by headings. The subsection was the only heading in
# the section, so the shallowest-depth rule made it the title depth and read it
# as a third finding on the clean hunk -- the shape Codex's round-4 review found.
BOLD_REMEDIATION_SUBHEADING_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

**1. Pagination offset skips a whole page - `src/handlers.js:18`**

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

##### Suggested test - `test/handlers.test.js:8`

Add a case asserting that page 1 returns rows starting at offset 0.

**2. The write is never awaited - `src/handlers.js:37`**

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# Heading-titled findings with the remediation subsection written at the
# titles' own depth. Depth cannot tell the two apart here; only the number can.
SAME_DEPTH_SUBHEADING_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

#### 1. Pagination offset skips a whole page - `src/handlers.js:18`

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

#### Suggested test - `test/handlers.test.js:8`

Add a case asserting that page 1 returns rows starting at offset 0.

#### 2. The write is never awaited - `src/handlers.js:37`

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# Bold titles again, with the subsection numbered as the first step of the
# finding's remediation. The number makes it look like a title, so what keeps it
# a subsection is that the section never opened with a heading.
BOLD_NUMBERED_SUBHEADING_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

**1. Pagination offset skips a whole page - `src/handlers.js:18`**

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

##### 1. Suggested test - `test/handlers.test.js:8`

Add a case asserting that page 1 returns rows starting at offset 0.

**2. The write is never awaited - `src/handlers.js:37`**

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# Findings titled by headings that carry no number. Nothing in the line tells
# such a title from a subsection, so the section is refused rather than guessed.
UNNUMBERED_HEADING_TITLES_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

#### Pagination offset skips a whole page - `src/handlers.js:18`

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

#### The write is never awaited - `src/handlers.js:37`

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# An unnumbered heading ahead of bold-titled findings. It belongs to no finding
# and titles none, so it is content in neither list form.
HEADING_AHEAD_OF_BOLD_TITLES_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

#### Suggested test - `test/handlers.test.js:8`

Add a case asserting that page 1 returns rows starting at offset 0.

**1. Pagination offset skips a whole page - `src/handlers.js:18`**

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

**2. The write is never awaited - `src/handlers.js:37`**

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# Heading-titled findings with a numbered subsection one level deeper. Both
# headings are numbered and the section opens with a heading, so only the
# finding-title depth keeps the subsection inside the finding above it.
NUMBERED_SUBHEADING_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

#### 1. Pagination offset skips a whole page - `src/handlers.js:18`

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

##### 1. Reproduce - `test/handlers.test.js:8`

Ask for page 1 and assert that the first row returned is at offset 0.

#### 2. The write is never awaited - `src/handlers.js:37`

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# A section that mixes title forms: bold titles with a real second finding
# titled `#### 2.` between them. The section opens in bold, so the heading folds
# into finding 1 exactly as a subsection would, and finding 1 -- which names
# `listOrdersHandler` and cites no line -- is placed by the heading's clean-hunk
# citation instead. Nothing in the form tells this heading from the subsections
# that must fold, so the count stands and the fold is quoted for the analyst.
MIXED_TITLE_FORMS_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

**1. Pagination offset skips a whole page in `listOrdersHandler`**

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

#### 2. The pagination test pins the wrong offset - `test/handlers.test.js:8`

The test asserts the wrong offset for page 1, so it passes against the bug.

**3. The write is never awaited - `src/handlers.js:37`**

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# Heading-titled findings, the first quoting a shell snippet whose comment line
# is heading-shaped. The titles open their findings and the comment is quoted
# code, so neither is a heading this report folded.
FENCED_HEADING_IN_TITLED_FINDING_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical

#### 1. Pagination offset skips a whole page - `src/handlers.js:18`

The offset is computed from a one-based page number, so `listOrdersHandler`
never returns the first page of results.

```sh
# page 1 should start at the first order
curl 'localhost:3000/orders?page=1&size=10'
```

#### 2. The write is never awaited - `src/handlers.js:37`

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# Finding 1 names the planted pagination bug and cites no line of it; the one
# line it does cite is the test its remediation asks for. The citation places
# it, so it lands on `test_fixture`: `recall` one low and a blocking finding on
# a clean hunk, with the grader agreeing. A cited line is the reviewer's own
# statement of where to look, so the placement stands and the name it
# contradicts is quoted for the analyst.
CITATION_CONFLICT_REPORT = """## Review: "paginate order listing and add order creation"

### Critical

**1. Pagination skips the first page of results**

`listOrdersHandler` computes the offset from a one-based page number, so page
1 starts at row `size` and the first page is never returned.

**Suggested test:** Add a regression at test/handlers.test.js:8 asserting that
page 1 starts at offset 0.

**2. The write is never awaited - `src/handlers.js:37`**

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# The same two findings with each citation on the line its name owns, so the
# citations and the names agree.
AGREEING_OFFSET_FINDING = """**1. Pagination skips the first page of results - `src/handlers.js:18`**

`listOrdersHandler` computes the offset from a one-based page number, so page
1 starts at row `size` and the first page is never returned.
"""
AGREEING_SAVE_FINDING = """**2. The write is never awaited - `src/handlers.js:37`**

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.
"""
# Citations wider than the name: they reach the planted bug the finding names
# and a clean hunk it mentions in passing. The named region is among the cited
# ones, so nothing is contradicted; which of the two the finding is counted in
# is `span-ambiguous`'s to say.
CITATION_WIDER_THAN_NAME_FINDING = """**1. Pagination skips the first page - `src/handlers.js:18`**

`listOrdersHandler` computes the offset from a one-based page number; the store call at `src/store.js:6` is fine as written.
"""
# Finding 1 names the planted pagination bug only in English ("off by one", the
# `PROSE` name of `offset_bug`), and the one line it cites is the test its
# remediation asks for. That citation's path is also a `test_fixture`
# identifier, and the identifier tier outranks the English one, so read as a
# name it shadowed the bug: the citation agreed with a name it supplied itself.
PROSE_NAMED_CITATION_CONFLICT_REPORT = """## Review

### Critical

**1. Pagination offset is off by one**

The handler computes the offset from a one-based page number, so page 1
starts at row `size` and the first page is never returned.

**Suggested test:** Add a regression at test/handlers.test.js:8 asserting that
page 1 starts at offset 0.

**2. The write is never awaited - `src/handlers.js:37`**

`saveOrder` returns a promise the handler drops, so a failed write is
invisible and the request still reports success.

### Assessment

**Ready to merge?** No
"""
# The severity-lettered numbering three Phase 5 reports wrote (`9a6c`, `d2e2`,
# `1c6a`): the section's initial before the digits of a bold title. The bolded
# claim closing the first finding is the shape of a bullet start, so only the
# lettered title being read as numbered keeps it inside the finding, as in
# GUARD_FINDING.
LETTERED_OFFSET_FINDING = """**C1. `src/handlers.js:18` — off-by-one offset makes the first page of orders permanently unreachable.**

- **Input:** a request with `page=1, size=10`.
- **Outcome:** the handler asks the store for rows from 10, so the first ten
  orders are never returned on the first page.
- **Reject a request whose page is below 1.**
"""
LETTERED_SAVE_FINDING = """**C2. `src/handlers.js:37` — unawaited `store.saveOrder` returns a false 201.**

The handler answers before the write resolves, so a rejected write becomes an
unhandled rejection.
"""
# The heading form of the same numbering, as `a856` wrote it: `#### C1. ...`
# under a `###` severity heading, the citation on the bold line below.
LETTERED_HEADING_REPORT = """## Review: "paginate order listing and add order creation"

### Issues

### Critical (Must Fix)

#### C1. Pagination off-by-one — the first page of orders is permanently unreachable
**`src/handlers.js:18`** — `const offset = page * size;`

`page` is documented as 1-based, so page 1 must map to offset 0. It maps to
offset `size`.

#### C2. `createOrderHandler` never awaits `saveOrder` — returns 201 for orders it did not save
**`src/handlers.js:37`**

The rejection is unhandled and the 201 is returned before the store has
validated anything.

### Important (Should Fix)

_None._

### Assessment

**Ready to merge?** No
"""
# The Minor section two Phase 5 reports (`720d`, `b93e`) wrote as column-0
# bullets, each a bold title with its prose running on after it, in both of the
# shapes they use: a bolded citation alone, and a bolded title sentence.
BOLD_TITLE_MINOR_BULLETS = """- **`test/handlers.test.js:11`** — `seed()` mutates the shared `store.orders` and is called from only one test.
- **No documentation.** No README or API notes describe the new query parameters.
- **`src/handlers.js:24` — the page response carries no `total` or `hasMore`.** Clients can only detect the last page by receiving a short one.
"""
# A section of nothing but colon labels: the bullets a finding structures
# itself with, and no finding for them to structure.
COLON_LABELS_ONLY = """- **Fix:** restore the guard before computing the offset.
- **Input:** a request with `page=1, size=10`.
"""
# A bold-titled bullet ahead of a numbered section's first finding. Where the
# section numbers its findings this is scaffolding, skipped and reported.
TITLE_BULLET_LEAD = """- **Two blockers, both in the handlers.** The rest is minor.
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


def write_launch_log(
    evidence_dir: str,
    arm: str,
    run_dir: str,
    header: str | None = None,
    last: str | None = None,
) -> None:
    """A launch log of the shape `resolve_arm` reads, naming one run.

    :param evidence_dir: The synthetic campaign directory.
    :param arm: The arm the log's name declares.
    :param run_dir: The run directory the log records.
    :param header: The header line to write instead of the matching one, or
        ``""`` to write no header at all.
    :param last: The last line to write instead of this log's DONE line.
    """

    logs = os.path.join(evidence_dir, "logs")
    os.makedirs(logs, exist_ok=True)
    name = f"{arm}-{SCENARIO}-p1.log"
    if header is None:
        header = f"arm={arm} scenario={SCENARIO} repeat=1 proc=p1 budget=default"
    with open(os.path.join(logs, name), "w", encoding="utf-8") as handle:
        if header:
            handle.write(header + "\n")
        handle.write(f"run-dir   {run_dir}\n")
        handle.write((last if last is not None else f"DONE {arm} {SCENARIO} p1") + "\n")


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
            # not one of the six hunks, and an import line is in no range. The
            # third nit is the rule by itself -- one hunk, named by its own
            # identifier, with a citation in no range.
            run_dir = run(
                build_report(
                    [OFFSET_FINDING],
                    [SAVE_FINDING, CONFIG_JSON_FINDING, IMPORT_NIT_FINDING, READFILE_NIT_FINDING],
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
                return f"expected all three nits to be adjudicated, got {notes}"
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

        def identifier_beats_prose() -> str:
            # Each of these is about a clean hunk and says "off by one" in
            # passing. Scored as the planted pagination bug they would read
            # recall 2, blocking 0 -- the flattering direction.
            run_dir = run(
                build_report(
                    [OFFSET_FINDING], [RETRY_OFF_BY_ONE_FINDING, PARSE_OFF_BY_ONE_FINDING]
                )
            )
            code, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=1,
                blocking_on_clean=2,
                clean_hunks_hit="with_retry,parse_order_id",
                proof_total=3,
                accepted="no",
            ) or ("" if code == 0 else f"exit {code}, expected 0")

        def name_collision_unattributed() -> str:
            # Two regions named at the same specificity. Picking either would
            # be this script's guess, so the analyst gets both names.
            run_dir = run(build_report([OFFSET_FINDING], [COLLISION_FINDING]))
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=1,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=2,
                accepted="no",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            # The keys, not the finding's own words: `withRetry` appears in the
            # quoted text, `with_retry` only in the candidate list.
            named = [
                note
                for note in notes
                if "\tunattributed\t" in note and "unawaited_save" in note and "with_retry" in note
            ]
            if len(named) != 1:
                return f"the collision was not named for the analyst: {notes}"
            return ""

        def name_alternatives() -> str:
            # One probe per alternative of the two bug patterns, each uncited
            # so the name table is what places it. Without these, replacing
            # either pattern with one that never matches leaves the suite green.
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING]))
            ranges = resolve_ranges(run_dir)
            probes = (
                ("the handler computes `page * size`, which skips a page", "offset_bug"),
                ("the first page is off by one", "offset_bug"),
                ("`listOrdersHandler` returns the wrong rows: the offset is wrong", "offset_bug"),
                ("pagination is decided before `listOrdersHandler` validates it", "offset_bug"),
                ("`saveOrder` is called without `await`", "unawaited_save"),
                ("the handler answers 201 before `saveOrder` resolves", "unawaited_save"),
                ("`createOrderHandler` replies before the write is awaited", "unawaited_save"),
            )
            for text, key in probes:
                got = attribute(text, ranges)
                if got != (key,):
                    return f"{text!r} attributed to {got}, expected ({key!r},)"
            return ""

        def literal_not_english() -> str:
            # Every IDENTIFIERS alternative is a token the fixture contains, so
            # one made of ordinary words has to match the quoting rather than
            # the words. `list failed` is the `log.error` call's own message;
            # "the list failed" is a sentence about anything. `page * size` is
            # a multiplication; `page *size*` is markdown emphasis. Both read
            # as the region they are not: a correct pagination finding scored
            # as a block on the `catch` arm moves recall down and
            # blocking_on_clean up at once.
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING]))
            ranges = resolve_ranges(run_dir)
            probes: tuple[tuple[str, tuple[str, ...]], ...] = (
                ("the list failed to paginate on page one", ()),
                ("the list failed with a 500 when the store is empty", ()),
                ("Pagination is broken: the list failed to return the first page", ()),
                ("the catch arm logs `list failed` and rethrows", ("log_rethrow",)),
                ("the handler's `log.error('list failed', err)` hides the stack", ("log_rethrow",)),
                ("the page *size* is never validated", ()),
                ("the *page* size defaults to 20", ()),
                ("the offset is computed as page * size", ("offset_bug",)),
                ("the handler computes `page*size`", ("offset_bug",)),
            )
            for text, want in probes:
                got = attribute(text, ranges)
                if got != want:
                    return f"{text!r} attributed to {got}, expected {want}"
            return ""

        def cited_out_of_range_names_a_hunk() -> str:
            # A citation just outside a hunk -- an import line, a signature
            # line -- restricts the name pass to the planted bugs. The region
            # the finding names is then out of scope, and the restriction may
            # not answer by promoting a weaker match on another region:
            # scoring this clean-hunk nit as the planted pagination bug reads
            # recall 2 for a report that found one bug.
            run_dir = run(build_report([SAVE_FINDING], [RETRY_OFF_BY_ONE_CITED_FINDING]))
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=1,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=2,
                accepted="no",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            # The key, not the finding's own words: `withRetry` is in the
            # quoted text, `with_retry` only in the candidate it names.
            named = [
                note for note in notes if "\tunattributed\t" in note and "with_retry" in note
            ]
            if len(named) != 1:
                return f"the excluded candidate was not named for the analyst: {notes}"
            ranges = resolve_ranges(run_dir)
            probes: tuple[tuple[str, tuple[str, ...]], ...] = (
                ("Retry count is off by one in `withRetry` - `src/util.js:3`", ()),
                ("Retry count is off by one in `withRetry`", ("with_retry",)),
                # Decision 1: a citation in no range, rescued by a bug's name.
                (
                    (
                        "The write is never awaited - `src/handlers.js:36`. "
                        "`saveOrder` is called without `await`."
                    ),
                    ("unawaited_save",),
                ),
                # Decision 2's own example: a clean hunk named, nothing to
                # place it with.
                ("`readFileSync` blocks the event loop - `config.json:4`", ()),
            )
            for text, want in probes:
                got = attribute(text, ranges)
                if got != want:
                    return f"{text!r} attributed to {got}, expected {want}"
            return ""

        def mixed_list_markers() -> str:
            # A section that opens in the bullet form and switches to numbers.
            # The bullet finding used to be discarded with no token, and recall
            # read 1 for a report that found both planted bugs.
            run_dir = run(build_report([MIXED_BULLET_FINDING, SAVE_FINDING_BY_LINE], []))
            code, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=2,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=2,
                accepted="yes",
            ) or ("" if code == 0 else f"exit {code}, expected 0")

        def numbered_finding_keeps_its_bullets() -> str:
            # The mandatory regression guard: 4 of the 7 real reviewer reports
            # put column-0 bullets inside a numbered finding, and most of them
            # are not label bullets. Reading those as finding starts would cut
            # this one into three and split its citation from its text.
            run_dir = run(build_report([GUARD_FINDING], []))
            code, rows, _ = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            return expect(
                rows[0],
                recall=1,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=1,
                accepted="no",
            ) or ("" if code == 0 else f"exit {code}, expected 0")

        def unrecognized_finding_before_the_first() -> str:
            # A finding in neither recognized form, ahead of one in the
            # numbered form. It may not be dropped without a token.
            # No sidecar: the template is built from the same parse, so a
            # report this script cannot read has no sidecar to write either.
            run_dir = run(
                build_report([UNRECOGNIZED_LEAD_FINDING, SAVE_FINDING_BY_LINE], []),
                sidecar=False,
            )
            code, rows, notes = measure([run_dir], evidence)
            if rows:
                return f"{len(rows)} rows, expected none"
            if code == 0:
                return "exit 0, expected non-zero"
            if not any("\treport-unparsed\t" in note for note in notes):
                return f"no report-unparsed line in {notes}"
            return ""

        def fenced_snippet_before_the_first_finding() -> str:
            # Quoting the offending lines above the list is an ordinary
            # reviewer habit, and a fence is quoted material rather than a
            # finding this script failed to read. Voiding the trial over it
            # costs the campaign a determinate run; unfenced prose in the same
            # position still does, because that shape can be a finding.
            run_dir = run(build_report([QUOTED_DIFF_LEAD, OFFSET_FINDING], [SAVE_FINDING]))
            code, rows, _ = measure([run_dir], evidence)
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
                return f"exit {code}, expected 0"
            finding = OFFSET_FINDING.rstrip("\n").split("\n")
            prose = ["A summary first: the pagination is wrong.", "", *finding]
            both = [*QUOTED_DIFF_LEAD.rstrip("\n").split("\n"), "", *prose]
            for label, body in (("prose", prose), ("a fence and prose", both)):
                try:
                    split_findings("Critical", body)
                except RunError as error:
                    if error.kind != "report-unparsed":
                        return f"{label} raised {error.kind}, expected report-unparsed"
                else:
                    return f"{label} before the first finding was dropped silently"
            return ""

        def section_preamble_is_not_a_finding() -> str:
            # A bulleted line opens a finding when it is written like one: the
            # whole line bolded, the way every finding of every real report is
            # titled. A bold label with the sentence trailing after it is the
            # report talking about itself, and counting it read `proof_total`
            # one high and queued a line about nothing for the analyst.
            run_dir = run(build_report([SECTION_PREAMBLE, OFFSET_FINDING], [SAVE_FINDING]))
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
                return f"exit {code}, expected 0"
            if any("\tunattributed\t" in note for note in notes):
                return f"the preamble was queued for adjudication: {notes}"
            body = [
                "- **Note:** ordered by severity.",
                "",
                *OFFSET_FINDING.rstrip("\n").split("\n"),
            ]
            findings = split_findings("Critical", body)
            if len(findings) != 1:
                return f"{len(findings)} findings, expected 1: {findings}"
            return ""

        def scaffolding_bullet_is_reported() -> str:
            # A finding titled with a bold clause and a note about the list are
            # the same line to any rule that reads them, so no rule can count
            # one and skip the other. The count keeps the reading the real
            # reports need -- the bullet is scaffolding -- and the skip is
            # named on stderr rather than taken in silence, which is the one
            # failure mode this instrument must not have.
            run_dir = run(build_report([CLAUSE_BULLET_FINDING, SAVE_FINDING_BY_LINE], []))
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=1,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=1,
                accepted="no",
            )
            if problem:
                return problem
            # The note is a reading for the analyst, not an instrument failure:
            # the row stands and the trial counts.
            if code != 0:
                return f"exit {code}, expected 0"
            reported = [note for note in notes if "\tscaffolding-skipped\t" in note]
            if len(reported) != 1:
                return f"{len(reported)} scaffolding-skipped lines, expected 1: {notes}"
            if "Pagination is broken" not in reported[0]:
                return f"the skipped line is not quoted: {reported[0]}"
            # The label bullet is the same shape and reported the same way. A
            # bullet that wraps is still one bullet: its second line is part of
            # it, not a second thing skipped.
            numbered = OFFSET_FINDING.rstrip("\n").split("\n")
            shapes: tuple[tuple[str, list[str]], ...] = (
                ("the label bullet", ["- **Note:** ordered by severity.", "", *numbered]),
                (
                    "the wrapped preamble",
                    [*SECTION_PREAMBLE.rstrip("\n").split("\n"), "", *numbered],
                ),
            )
            for label, body in shapes:
                dropped: list[str] = []
                findings = split_findings("Critical", body, dropped)
                if len(findings) != 1:
                    return f"{label}: {len(findings)} findings, expected 1: {findings}"
                if len(dropped) != 1:
                    return f"{label}: {len(dropped)} lines reported, expected 1: {dropped}"
            return ""

        def scaffolding_note_stays_off_the_real_shape() -> str:
            # A note on most trials is a note the analyst learns to skip, and
            # then it says nothing when it matters. Neither shape the real
            # reports carry is a finding this script failed to count: a
            # numbered finding's own column-0 bullets (4 of the 7 reports) are
            # part of the finding above them, and a fence is quoted code.
            shapes: tuple[tuple[str, list[str], list[str]], ...] = (
                ("a numbered finding's own bullets", [GUARD_FINDING], []),
                ("a quoted fence", [QUOTED_DIFF_LEAD, OFFSET_FINDING], [SAVE_FINDING]),
            )
            for label, critical, important in shapes:
                run_dir = run(build_report(critical, important))
                code, rows, notes = measure([run_dir], evidence)
                if len(rows) != 1:
                    return f"{label}: {len(rows)} rows, expected 1"
                if code != 0:
                    return f"{label}: exit {code}, expected 0"
                if any("\tscaffolding-skipped\t" in note for note in notes):
                    return f"{label}: reported a skip that did not happen: {notes}"
            return ""

        def bullet_only_section_reports_a_later_merge() -> str:
            # A section that numbers nothing has no start below its first
            # bullet, so a clause-titled bullet lower down is absorbed into the
            # bullet above it. Reporting only what precedes the first start
            # said nothing about that merge: the swallowed bullet faults a
            # clean hunk, `blocking_on_clean` reads 0 and `accepted` flips to
            # yes, in the direction that flatters the treatment.
            run_dir = run(
                build_report(
                    [MIXED_BULLET_FINDING, BULLET_SAVE_FINDING, CLAUSE_BULLET_RETRY_FINDING],
                    [],
                )
            )
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            # The count is the one the real reports need and does not move; the
            # note is what keeps it from being a silent wrong number.
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
                return f"exit {code}, expected 0"
            reported = [note for note in notes if "\tscaffolding-skipped\t" in note]
            if len(reported) != 1:
                return f"{len(reported)} scaffolding-skipped lines, expected 1: {notes}"
            if "Retry is off by one" not in reported[0]:
                return f"the merged bullet is not quoted: {reported[0]}"
            body = [
                *MIXED_BULLET_FINDING.rstrip("\n").split("\n"),
                "",
                *BULLET_SAVE_FINDING.rstrip("\n").split("\n"),
                "",
                *CLAUSE_BULLET_RETRY_FINDING.rstrip("\n").split("\n"),
            ]
            dropped: list[str] = []
            findings = split_findings("Critical", body, dropped)
            if len(findings) != 2:
                return f"{len(findings)} findings, expected 2: {findings}"
            if len(dropped) != 1:
                return f"{len(dropped)} lines reported, expected 1: {dropped}"
            return ""

        def scaffolding_note_only_where_a_count_could_move() -> str:
            # Every count is read from the blocking findings, so a bullet a
            # Minor section skipped cannot have moved one and a note about it
            # is a note on a trial nothing happened in -- exactly the noise the
            # analyst learns to read past, and then it says nothing when it
            # matters. The same bullet in the Critical section still says so.
            run_dir = run(
                build_report(
                    [CLAUSE_BULLET_FINDING, OFFSET_FINDING],
                    [],
                    [CLAUSE_BULLET_FINDING, MINOR_RETRY_FINDING],
                )
            )
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1"
            problem = expect(
                rows[0],
                recall=1,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=1,
                accepted="no",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            reported = [note for note in notes if "\tscaffolding-skipped\t" in note]
            if any("Minor section" in note for note in reported):
                return f"a Minor skip moves no count and was reported anyway: {reported}"
            if len(reported) != 1 or "Critical section" not in reported[0]:
                return f"the Critical skip is not the one line reported: {reported}"
            return ""

        def nested_heading_findings_are_counted() -> str:
            # A report that titles each finding with a heading deeper than the
            # severity heading above it. Ending the section at that heading
            # left the section empty and dropped the finding into a
            # severity-"" section the reader skips, so the reviewer found both
            # planted bugs and the instrument recorded that it found none --
            # with no `report-unparsed` to say so, because the sections existed
            # and were genuinely empty. An adoption decision is read from these
            # counts, so a wrong one that raises nothing is the worst failure
            # this instrument has.
            run_dir = run(NESTED_HEADING_REPORT)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            if notes != ["disagreements", "(none)"]:
                return f"unexpected disagreements block {notes}"
            return ""

        def a_shallower_heading_does_not_open_a_finding() -> str:
            # The other edge of the depth rule. `### Assessment` under a
            # `### Critical` is that section's sibling, not a finding of it,
            # and a rule that kept it would count the report's closing prose as
            # a blocking finding, read `proof_total` high and queue a line
            # about nothing for the analyst.
            #
            # Checked on the section itself first, because the row no longer
            # shows it: `### Assessment` carries no number, so kept inside the
            # section it would fold into the finding above as prose and every
            # count would read the same. The section has to close at its own
            # depth whether or not a count would move.
            inside = [
                line
                for severity, body in split_sections(SHALLOW_HEADING_REPORT)
                if severity == "Critical"
                for line in body
                if line.lstrip().startswith("###")
            ]
            if inside:
                return f"a sibling heading stayed inside the Critical section: {inside}"
            run_dir = run(SHALLOW_HEADING_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if any("\treport-unparsed\t" in note for note in notes):
                return f"the Assessment prose was read as content of the section: {notes}"
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            problem = expect(
                rows[0],
                recall=1,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=1,
                accepted="no",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            if notes != ["disagreements", "(none)"]:
                return f"the closing prose was read as a finding: {notes}"
            return ""

        def a_label_opened_section_still_closes_on_any_heading() -> str:
            # The bold label form has no `#` level, and the depth rule invents
            # none for it: every heading ends it, as before. Checked at all six
            # depths, because an invented level would only show at the ones
            # deeper than it.
            for depth in range(1, 7):
                text = (
                    "**Critical**\n\n"
                    "**1. A finding - `src/handlers.js:18`**\n\n"
                    f"{'#' * depth} Assessment\n\nprose that is not a finding\n"
                )
                inside = [
                    line
                    for severity, body in split_sections(text)
                    if severity == "Critical"
                    for line in body
                    if line.lstrip().startswith("#")
                ]
                if inside:
                    return f"a depth-{depth} heading stayed inside the label section: {inside}"
            run_dir = run(LABEL_SECTION_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if any("\treport-unparsed\t" in note for note in notes):
                return f"the label-opened section stopped reading: {notes}"
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            problem = expect(
                rows[0],
                recall=1,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=1,
                accepted="no",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            if notes != ["disagreements", "(none)"]:
                return f"the heading below the label was read as a finding: {notes}"
            return ""

        def a_heading_titled_finding_keeps_its_bullets() -> str:
            # `numbered_finding_keeps_its_bullets` for the heading form. The
            # heading start is ranked with the numbered list, so `opens` still
            # marks where the section's first finding begins and the column-0
            # bullets below it stay inside it. Ranking it with the bulleted
            # list instead leaves `opens` at `len(body)`, which reads the
            # bolded claim as a second finding and the label as a skip:
            # `proof_total` high and a note about nothing, on the shape 4 of
            # the 7 real reports write.
            body = next(
                lines
                for severity, lines in split_sections(NESTED_HEADING_WITH_BULLETS_REPORT)
                if severity == "Critical"
            )
            skipped: list[str] = []
            found = split_findings("Critical", body, skipped)
            if len(found) != 1:
                return f"the finding's own bullets were read as {len(found)} findings, expected 1"
            if skipped:
                return f"a bullet inside the finding was reported as skipped: {skipped}"
            run_dir = run(NESTED_HEADING_WITH_BULLETS_REPORT)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            if notes != ["disagreements", "(none)"]:
                return f"unexpected disagreements block {notes}"
            return ""

        def a_remediation_subheading_is_not_a_second_finding() -> str:
            # The defect the depth rule exists for. A `##### Suggested test`
            # under a `####` finding title was read as a sibling finding, and
            # because it cites a clean hunk of the fixture it attributed there
            # and raised `blocking_on_clean`. Paired with the failing grader a
            # "not ready to merge" report comes with, `accepted` flipped to no,
            # the grader agreed, and the run said nothing: a wrong number an
            # adoption decision is read from, with no line to catch it.
            body = next(
                lines
                for severity, lines in split_sections(REMEDIATION_SUBHEADING_REPORT)
                if severity == "Critical"
            )
            skipped: list[str] = []
            found = split_findings("Critical", body, skipped)
            if len(found) != 2:
                return f"the remediation subsection made {len(found)} findings, expected 2"
            if skipped:
                return f"a line inside a finding was reported as skipped: {skipped}"
            run_dir = run(REMEDIATION_SUBHEADING_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            # The exact set, because what made this blocking was the silence:
            # `grader-disagreement` is the line the same report without the
            # subsection gets, and `span-ambiguous` says the finding's own
            # citations now reach the test file too. `heading-folded` quotes the
            # subsection the finding absorbed. None is the phantom's
            # `unattributed`, and nothing else may appear.
            kinds = sorted({note.split("\t")[1] for note in notes if "\t" in note})
            if kinds != ["grader-disagreement", "heading-folded", "span-ambiguous"]:
                return f"the disagreements block reads {kinds}: {notes}"
            return ""

        def disclosure_sevens_shape_now_reads_as_one_finding() -> str:
            # Round 6 disclosed this shape as a known consequence and graded it
            # Minor because the phantom finding names and cites nothing, so it
            # goes `unattributed` and the analyst is told. It still read
            # `proof_total` one high, and it is the shape the clean-hunk defect
            # above is a variant of, so the depth rule retires it too.
            body = next(
                lines
                for severity, lines in split_sections(SUGGESTED_FIX_SUBHEADING_REPORT)
                if severity == "Critical"
            )
            found = split_findings("Critical", body)
            if len(found) != 1:
                return f"the suggested fix made {len(found)} findings, expected 1"
            run_dir = run(SUGGESTED_FIX_SUBHEADING_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            problem = expect(
                rows[0],
                recall=1,
                blocking_on_clean=0,
                clean_hunks_hit=UNKNOWN,
                proof_total=1,
                accepted="no",
            )
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            # The subsection is quoted once as a fold, not queued as a phantom
            # finding's `unattributed`.
            kinds = [note.split("\t")[1] for note in notes if "\t" in note]
            if kinds != ["heading-folded"]:
                return f"the suggested fix was queued as {kinds}: {notes}"
            return ""

        def a_deeper_heading_before_the_first_finding_fails_closed() -> str:
            # The other side of the depth rule, and a decision rather than a
            # side effect: a heading too deep to start a finding, written where
            # no finding is open yet, belongs to nothing. That is content in
            # neither list form, and the section already refuses to drop such a
            # line silently. No sidecar, as for every report this script cannot
            # read: the template is built from the same parse.
            run_dir = run(DEEPER_HEADING_LEAD_REPORT, sidecar=False)
            code, rows, notes = measure([run_dir], evidence)
            if rows:
                return f"{len(rows)} rows, expected none"
            if code == 0:
                return "exit 0, expected non-zero"
            if not any("\treport-unparsed\t" in note for note in notes):
                return f"no report-unparsed line in {notes}"
            return ""

        def a_bold_numbered_section_keeps_its_remediation_subheading() -> str:
            # The regression Codex's round-4 review asked for. A section that
            # titles its findings `**1. ...**` and writes one `#####`
            # remediation subsection had that lone heading as its shallowest,
            # so the depth rule promoted it to a title: a third finding on the
            # clean hunk, `blocking_on_clean` raised, `accepted` flipped, and
            # with the failing grader nothing disagreed. Either half of the
            # round-9 rule closes this on its own -- the subsection carries no
            # number, and the section opens with a bold title rather than a
            # heading -- so no single mutant owns this case. Its evidence is
            # that it failed against 89a94a0, the build before that rule.
            body = next(
                lines
                for severity, lines in split_sections(BOLD_REMEDIATION_SUBHEADING_REPORT)
                if severity == "Critical"
            )
            skipped: list[str] = []
            found = split_findings("Critical", body, skipped)
            if len(found) != 2:
                return f"the remediation subsection made {len(found)} findings, expected 2"
            if skipped:
                return f"a line inside a finding was reported as skipped: {skipped}"
            run_dir = run(BOLD_REMEDIATION_SUBHEADING_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            # As in `a_remediation_subheading_is_not_a_second_finding`: the
            # finding now carries the subsection's citation beside its own,
            # which is what `span-ambiguous` says, `heading-folded` quotes the
            # subsection, and nothing else may appear.
            kinds = sorted({note.split("\t")[1] for note in notes if "\t" in note})
            if kinds != ["grader-disagreement", "heading-folded", "span-ambiguous"]:
                return f"the disagreements block reads {kinds}: {notes}"
            return ""

        def a_same_depth_unnumbered_heading_is_not_a_finding() -> str:
            # Depth cannot help when the subsection sits at the titles' own
            # level: `#### Suggested test` between `#### 1.` and `#### 2.` was
            # the shallowest heading like the titles, and became a third
            # finding on the clean hunk. The number is the only mark that
            # tells a title from a subsection here.
            body = next(
                lines
                for severity, lines in split_sections(SAME_DEPTH_SUBHEADING_REPORT)
                if severity == "Critical"
            )
            skipped: list[str] = []
            found = split_findings("Critical", body, skipped)
            if len(found) != 2:
                return f"the same-depth subsection made {len(found)} findings, expected 2"
            if skipped:
                return f"a line inside a finding was reported as skipped: {skipped}"
            run_dir = run(SAME_DEPTH_SUBHEADING_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            kinds = sorted({note.split("\t")[1] for note in notes if "\t" in note})
            if kinds != ["grader-disagreement", "heading-folded", "span-ambiguous"]:
                return f"the disagreements block reads {kinds}: {notes}"
            return ""

        def a_numbered_subheading_under_bold_titles_is_not_a_finding() -> str:
            # The case the number alone does not settle: `##### 1. Suggested
            # test` is numbered, so it is title-shaped. What keeps it a
            # subsection is that the section opened with a bold title, and a
            # section that does not open with a heading promotes none.
            # Dropping that dispatch read it as a third finding on the clean
            # hunk.
            body = next(
                lines
                for severity, lines in split_sections(BOLD_NUMBERED_SUBHEADING_REPORT)
                if severity == "Critical"
            )
            skipped: list[str] = []
            found = split_findings("Critical", body, skipped)
            if len(found) != 2:
                return f"the numbered subsection made {len(found)} findings, expected 2"
            if skipped:
                return f"a line inside a finding was reported as skipped: {skipped}"
            run_dir = run(BOLD_NUMBERED_SUBHEADING_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            kinds = sorted({note.split("\t")[1] for note in notes if "\t" in note})
            if kinds != ["grader-disagreement", "heading-folded", "span-ambiguous"]:
                return f"the disagreements block reads {kinds}: {notes}"
            return ""

        def unnumbered_heading_titles_fail_closed() -> str:
            # A decision, not an accident. Findings titled by unnumbered
            # headings used to count correctly, but such a title has no mark
            # that tells it from a remediation subsection, and reading the
            # subsection as a title is the silent clean-hunk blocker this rule
            # exists to stop. None of the 7 real reviewer reports titles its
            # findings with headings of any kind, so the section is refused
            # and the analyst told, rather than guessed at. No sidecar, as for
            # every report this script cannot read.
            run_dir = run(UNNUMBERED_HEADING_TITLES_REPORT, sidecar=False)
            code, rows, notes = measure([run_dir], evidence)
            if rows:
                return f"{len(rows)} rows, expected none"
            if code == 0:
                return "exit 0, expected non-zero"
            if not any("\treport-unparsed\t" in note for note in notes):
                return f"no report-unparsed line in {notes}"
            return ""

        def a_heading_ahead_of_bold_titles_fails_closed() -> str:
            # An unnumbered heading before the first bold title was the only
            # heading in the section, so it became the title depth and a first
            # finding on the clean hunk. It titles nothing and sits inside
            # nothing, so it is content in neither list form, and the section
            # refuses it rather than drop it or count it.
            run_dir = run(HEADING_AHEAD_OF_BOLD_TITLES_REPORT, sidecar=False)
            code, rows, notes = measure([run_dir], evidence)
            if rows:
                return f"{len(rows)} rows, expected none"
            if code == 0:
                return "exit 0, expected non-zero"
            if not any("\treport-unparsed\t" in note for note in notes):
                return f"no report-unparsed line in {notes}"
            return ""

        def a_numbered_subheading_under_heading_titles_is_not_a_finding() -> str:
            # The depth rule in its own habitat. Every other subsection case
            # is now settled by the number before depth is consulted, which
            # left nothing to show that a numbered `##### 1. Reproduce` under
            # a `#### 1.` title stays inside it. Both are numbered and the
            # section opens with a heading, so only the finding-title depth
            # keeps the subsection from becoming a third finding on the clean
            # hunk. This read correctly before round 9; the case pins it.
            body = next(
                lines
                for severity, lines in split_sections(NUMBERED_SUBHEADING_REPORT)
                if severity == "Critical"
            )
            skipped: list[str] = []
            found = split_findings("Critical", body, skipped)
            if len(found) != 2:
                return f"the numbered subsection made {len(found)} findings, expected 2"
            if skipped:
                return f"a line inside a finding was reported as skipped: {skipped}"
            run_dir = run(NUMBERED_SUBHEADING_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            kinds = sorted({note.split("\t")[1] for note in notes if "\t" in note})
            if kinds != ["grader-disagreement", "heading-folded", "span-ambiguous"]:
                return f"the disagreements block reads {kinds}: {notes}"
            return ""

        def a_folded_numbered_heading_is_reported() -> str:
            # The shape the round-9 fold read silently. The `#### 2.` finding
            # folds into the bold finding above it, hands that finding its
            # clean-hunk citation, and so keeps finding 1's function name from
            # placing it: `recall` one low with the grader agreeing and nothing
            # on stderr. The count is not asserted -- it is the disclosed
            # misreading, and a later build that reads it correctly must not
            # fail here. What is asserted is that the analyst is told.
            run_dir = run(MIXED_TITLE_FORMS_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            if code != 0:
                return f"exit {code}, expected 0: a folded heading is a reading"
            reported = [note for note in notes if "\theading-folded\t" in note]
            if len(reported) != 1:
                return f"{len(reported)} heading-folded lines, expected 1: {notes}"
            # The key is recomputed from the report rather than taken from the
            # parse under test, as `perfect` does: finding 1 runs from its title
            # to the next start, the folded heading included.
            block = MIXED_TITLE_FORMS_REPORT[
                MIXED_TITLE_FORMS_REPORT.index("**1. ") : MIXED_TITLE_FORMS_REPORT.index("**3. ")
            ]
            key = hashlib.sha256(" ".join(block.split()).encode("utf-8")).hexdigest()[:12]
            want = (
                f"Critical finding {key}: heading read as part of this finding: "
                "#### 2. The pagination test pins the wrong offset - `test/handlers.test.js:8`"
            )
            if reported[0].split("\t", 2)[2] != want:
                return f"the note reads {reported[0]!r}, expected {want!r}"
            return ""

        def a_folded_unnumbered_heading_is_reported() -> str:
            # The gate's round-4 shape, where the fold is the right reading: a
            # remediation subsection under a bold title belongs to that
            # finding, and the counts say so. It is still quoted, because an
            # unnumbered heading written as a real finding after bold titles is
            # the same line, and there the fold moves a count.
            run_dir = run(BOLD_REMEDIATION_SUBHEADING_REPORT)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            reported = [note for note in notes if "\theading-folded\t" in note]
            if len(reported) != 1:
                return f"{len(reported)} heading-folded lines, expected 1: {notes}"
            if "##### Suggested test" not in reported[0]:
                return f"the folded heading is not quoted: {reported[0]}"
            return ""

        def a_heading_in_a_minor_finding_is_not_reported() -> str:
            # Every count is read from the blocking findings, so a heading a
            # Minor finding absorbed moved nothing, and a note about it is one
            # the analyst learns to read past.
            minor = MINOR_RETRY_FINDING + "\n##### Suggested fix\n\nAdd jitter to the delay.\n"
            report = build_report([OFFSET_FINDING], [SAVE_FINDING], [minor])
            # The heading did fold into the Minor finding. Without this the
            # case passes on a build that reports no fold anywhere.
            folds = [f.folded for f in parse_report(report) if f.severity == "Minor"]
            if folds != [("##### Suggested fix",)]:
                return f"the Minor finding folded {folds}, expected the suggested fix"
            run_dir = run(report)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            if code != 0:
                return f"exit {code}, expected 0"
            if any("\theading-folded\t" in note for note in notes):
                return f"a fold in a Minor finding moves no count and was reported: {notes}"
            return ""

        def a_title_or_fenced_heading_is_not_reported_as_folded() -> str:
            # A heading title is its finding's first line, not a heading the
            # finding absorbed, and a heading-shaped line inside a fence is
            # quoted code. A note on either would sit on most heading-titled
            # reports and say nothing.
            findings = parse_report(FENCED_HEADING_IN_TITLED_FINDING_REPORT)
            if len(findings) != 2 or "# page 1 should start" not in findings[0].text:
                return f"expected two findings, the fence inside the first: {findings}"
            if [f.folded for f in findings] != [(), ()]:
                return f"the findings folded {[f.folded for f in findings]}, expected none"
            run_dir = run(FENCED_HEADING_IN_TITLED_FINDING_REPORT)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            problem = expect(rows[0], recall=2, blocking_on_clean=0, proof_total=2, accepted="yes")
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            if any("\theading-folded\t" in note for note in notes):
                return f"a title or a fenced line was reported as folded: {notes}"
            return ""

        def a_remediation_citation_that_contradicts_the_named_bug_is_reported() -> str:
            # The round-11 shape. Finding 1 names `listOrdersHandler` and its
            # only citation is the test its remediation asks for, so the
            # citation places it on `test_fixture`: `recall` one low and a
            # blocking finding on a clean hunk, the grader agreeing, nothing on
            # stderr. The count is not asserted -- it is the disclosed
            # misreading, and a later build that reads it correctly must not
            # fail here. What is asserted is that the analyst is told, on a run
            # whose sidecar is present so the exit status is this note's alone.
            run_dir = run(CITATION_CONFLICT_REPORT, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            if code != 0:
                return f"exit {code}, expected 0: a citation conflict is a reading"
            reported = [note for note in notes if "\tcitation-conflict\t" in note]
            if len(reported) != 1:
                return f"{len(reported)} citation-conflict lines, expected 1: {notes}"
            # The key is recomputed from the report rather than taken from the
            # parse under test, as `perfect` does.
            block = CITATION_CONFLICT_REPORT[
                CITATION_CONFLICT_REPORT.index("**1. ") : CITATION_CONFLICT_REPORT.index("**2. ")
            ]
            key = hashlib.sha256(" ".join(block.split()).encode("utf-8")).hexdigest()[:12]
            want = (
                f"Critical finding {key}: placed by citation on test_fixture "
                "but names offset_bug"
            )
            if reported[0].split("\t", 2)[2] != want:
                return f"the note reads {reported[0]!r}, expected {want!r}"
            return ""

        def a_citation_that_agrees_with_its_name_is_not_reported() -> str:
            # Each citation on the line its finding's name owns: the shape of
            # every well-cited report, where a note would say nothing.
            report = build_report([AGREEING_OFFSET_FINDING], [AGREEING_SAVE_FINDING])
            run_dir = run(report)
            findings = parse_report(report, resolve_ranges(run_dir))
            if [f.conflict for f in findings] != [(), ()]:
                return f"the findings conflict on {[f.conflict for f in findings]}, expected none"
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            problem = expect(rows[0], recall=2, blocking_on_clean=0, accepted="yes")
            if problem:
                return problem
            if code != 0:
                return f"exit {code}, expected 0"
            if any("\tcitation-conflict\t" in note for note in notes):
                return f"a citation that agrees with its name was reported: {notes}"
            return ""

        def a_citation_covering_the_named_bug_and_a_hunk_is_not_a_conflict() -> str:
            # The named region is among the cited ones, so the citations
            # contradict nothing. That they also reach a hunk is what
            # `span-ambiguous` already reports; the test is a subset, not
            # equality, or every finding citing a span would be reported twice.
            report = build_report([CITATION_WIDER_THAN_NAME_FINDING], [AGREEING_SAVE_FINDING])
            run_dir = run(report)
            ranges = resolve_ranges(run_dir)
            findings = parse_report(report, ranges)
            # The shape itself, read without the code under test, so the case
            # cannot pass on a finding whose citations stopped reaching the hunk.
            cited = cited_spans(findings[0].text)
            hit = [key for key in ALL_KEYS if covered(ranges[key], cited)]
            named = name_candidates(findings[0].text)
            if (hit, named) != (["offset_bug", "store_slice"], ("offset_bug",)):
                return f"finding 1 covers {hit} and names {named}; expected the bug and a hunk"
            if findings[0].conflict:
                return f"finding 1 conflicts on {findings[0].conflict}, expected none"
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            if code != 0:
                return f"exit {code}, expected 0"
            if any("\tcitation-conflict\t" in note for note in notes):
                return f"a citation set covering the named bug was reported: {notes}"
            return ""

        def a_citation_conflict_in_a_minor_finding_is_not_reported() -> str:
            # Every count is read from the blocking findings, so a Minor
            # finding's placement moved nothing, and a note about it is one the
            # analyst learns to read past.
            conflicting = CITATION_CONFLICT_REPORT[
                CITATION_CONFLICT_REPORT.index("**1. ") : CITATION_CONFLICT_REPORT.index("**2. ")
            ]
            report = build_report(
                [AGREEING_OFFSET_FINDING], [AGREEING_SAVE_FINDING], [conflicting]
            )
            run_dir = run(report)
            # The Minor finding does conflict. Without this the case passes on a
            # build that reports no conflict anywhere.
            findings = parse_report(report, resolve_ranges(run_dir))
            conflicts = [f.conflict for f in findings if f.severity == "Minor"]
            if conflicts != [("offset_bug",)]:
                return f"the Minor finding conflicts on {conflicts}, expected offset_bug"
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            if code != 0:
                return f"exit {code}, expected 0"
            if any("\tcitation-conflict\t" in note for note in notes):
                return f"a conflict in a Minor finding moves no count and was reported: {notes}"
            return ""

        def a_finding_placed_by_name_is_not_a_conflict() -> str:
            # Finding 1 cites `src/handlers.js:36`, the statement above the
            # unawaited write, which lands in no range; its name places it.
            # With no citation in a range there is no placement for the name to
            # contradict, and a name that cannot place it either already goes
            # to the analyst as `unattributed`.
            report = build_report([SAVE_FINDING], [AGREEING_OFFSET_FINDING])
            run_dir = run(report)
            ranges = resolve_ranges(run_dir)
            findings = parse_report(report, ranges)
            cited = cited_spans(findings[0].text)
            if any(covered(span, cited) for span in ranges.values()):
                return f"finding 1's citation {cited} lands in a range; expected none"
            if (findings[0].attributions, findings[0].conflict) != (("unawaited_save",), ()):
                return (
                    f"finding 1 is placed on {findings[0].attributions} and conflicts on "
                    f"{findings[0].conflict}; expected unawaited_save by name and no conflict"
                )
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            if code != 0:
                return f"exit {code}, expected 0"
            if any("\tcitation-conflict\t" in note for note in notes):
                return f"a finding placed by name was reported as a conflict: {notes}"
            return ""

        def a_citation_path_is_not_read_as_a_name() -> str:
            # The round-12 shape. Finding 1 names the pagination bug only in
            # English and cites only the test its remediation asks for. Read as
            # a name, that citation's path outranked the English one, so the
            # citation agreed with itself: `recall` one low, a blocking finding
            # on a clean hunk and nothing on stderr. As in the round-11 case the
            # count is the disclosed misreading and is not asserted.
            report = PROSE_NAMED_CITATION_CONFLICT_REPORT
            block = report[report.index("**1. ") : report.index("**2. ")]
            # The path does shadow the English name when it is read as one.
            # Without this the case passes on a shape where it shadows nothing.
            named = name_candidates(block)
            if named != ("test_fixture",):
                return f"finding 1 names {named}; expected test_fixture alone"
            run_dir = run(report, status="fail")
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
            if code != 0:
                return f"exit {code}, expected 0: a citation conflict is a reading"
            reported = [note for note in notes if "\tcitation-conflict\t" in note]
            if len(reported) != 1:
                return f"{len(reported)} citation-conflict lines, expected 1: {notes}"
            # The key is recomputed from the report rather than taken from the
            # parse under test, as `perfect` does.
            key = hashlib.sha256(" ".join(block.split()).encode("utf-8")).hexdigest()[:12]
            want = (
                f"Critical finding {key}: placed by citation on test_fixture "
                "but names offset_bug"
            )
            if reported[0].split("\t", 2)[2] != want:
                return f"the note reads {reported[0]!r}, expected {want!r}"
            return ""

        def a_severity_lettered_number_opens_a_finding() -> str:
            # Three Phase 5 reports (`9a6c`, `d2e2`, `1c6a`) number their
            # findings `**C1. ...**`, `**I3. ...**`. Read as no number at all,
            # the section had content and no finding, and three valid trials
            # had no row.
            report = build_report([LETTERED_OFFSET_FINDING, LETTERED_SAVE_FINDING], [])
            body = next(
                lines for severity, lines in split_sections(report) if severity == "Critical"
            )
            found = split_findings("Critical", body)
            if [text.split(" ", 1)[0] for text in found] != ["**C1.", "**C2."]:
                return f"expected the two lettered findings, got {found}"
            # Both alternatives of the number rule take the letter, each of C,
            # I and M, with either closing mark. Nothing else about the number
            # moves, so another letter, a lower-case one or two of them is
            # still no number, and the section still refuses it.
            for title, reads in (
                ("**I7. The write is never awaited**", True),
                ("**M2) The backoff is not jittered**", True),
                ("C1. **Pagination offset skips a whole page**", True),
                ("**X1. Pagination offset skips a whole page**", False),
                ("**c1. Pagination offset skips a whole page**", False),
                ("**CI1. Pagination offset skips a whole page**", False),
            ):
                try:
                    count = len(split_findings("Critical", [title, "", "Some prose."]))
                except RunError as error:
                    if reads or error.kind != "report-unparsed":
                        return f"{title!r} raised {error.kind}: {error.evidence}"
                    continue
                if not reads:
                    return f"{title!r} was read as {count} finding(s), expected report-unparsed"
                if count != 1:
                    return f"{title!r} was read as {count} findings, expected 1"
            run_dir = run(report)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            return ""

        def a_severity_lettered_heading_titles_a_finding() -> str:
            # The heading form of the same numbering, as `a856` writes it.
            # Without the letter `#### C1. ...` is no title, so it is prose
            # ahead of any finding and the section is refused.
            body = next(
                lines
                for severity, lines in split_sections(LETTERED_HEADING_REPORT)
                if severity == "Critical"
            )
            folded: list[list[str]] = []
            found = split_findings("Critical", body, None, folded)
            if [text.split(" ", 2)[1] for text in found] != ["C1.", "C2."]:
                return f"expected the two lettered heading titles, got {found}"
            if folded != [[], []]:
                return f"a title was read as a folded heading: {folded}"
            run_dir = run(LETTERED_HEADING_REPORT)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            if notes != ["disagreements", "(none)"]:
                return f"unexpected disagreements block {notes}"
            return ""

        def bold_title_bullets_open_findings_where_nothing_is_numbered() -> str:
            # `720d` and `b93e` number their blocking findings and write the
            # Minor section as column-0 bullets, each a bold title with its
            # prose running on after it. Read as labels, the section had
            # content and no finding, and the trial had no row.
            report = build_report([OFFSET_FINDING], [SAVE_FINDING], [BOLD_TITLE_MINOR_BULLETS])
            bullets = BOLD_TITLE_MINOR_BULLETS.rstrip("\n").split("\n")
            minor = [f.text for f in parse_report(report) if f.severity == "Minor"]
            if [text.split("\n", 1)[0] for text in minor] != bullets:
                return f"the Minor bullets read as {minor}, expected one finding per bullet"
            run_dir = run(report)
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            return ""

        def colon_label_bullets_alone_still_fail_closed() -> str:
            # The other edge of the bullet-title rule. A bold run ending in a
            # colon is a label -- `- **Fix:**`, `- **Input:**` -- and a section
            # of nothing but labels has no finding for them to structure.
            # Reading them as titles would count a finding's scaffolding as
            # findings, so the section is refused, as it was before the rule.
            # No sidecar, as for every report this script cannot read.
            body = COLON_LABELS_ONLY.rstrip("\n").split("\n")
            try:
                found = split_findings("Minor", body)
            except RunError as error:
                if error.kind != "report-unparsed":
                    return f"the labels raised {error.kind}, expected report-unparsed"
            else:
                return f"the labels were read as {len(found)} finding(s), expected report-unparsed"
            run_dir = run(
                build_report([OFFSET_FINDING], [SAVE_FINDING], [COLON_LABELS_ONLY]), sidecar=False
            )
            code, rows, notes = measure([run_dir], evidence)
            if rows:
                return f"{len(rows)} rows, expected none"
            if code == 0:
                return "exit 0, expected non-zero"
            if not any("\treport-unparsed\t" in note for note in notes):
                return f"no report-unparsed line in {notes}"
            return ""

        def a_title_bullet_ahead_of_numbers_stays_scaffolding() -> str:
            # The bullet-title rule is for a section that numbers nothing. In
            # one that numbers its findings, a bold-titled bullet ahead of the
            # first number has always been scaffolding -- skipped, and named
            # for the analyst -- and it still is: the rule adds no start to a
            # numbered section.
            lead = TITLE_BULLET_LEAD.rstrip("\n")
            body = [
                lead,
                "",
                *OFFSET_FINDING.rstrip("\n").split("\n"),
                "",
                *SAVE_FINDING_BY_LINE.rstrip("\n").split("\n"),
            ]
            skipped: list[str] = []
            found = split_findings("Critical", body, skipped)
            if [text.split(" ", 1)[0] for text in found] != ["**1.", "**2."]:
                return f"expected the two numbered findings, got {found}"
            if skipped != [lead]:
                return f"reported {skipped} as skipped, expected the lead bullet"
            run_dir = run(
                build_report([TITLE_BULLET_LEAD, OFFSET_FINDING, SAVE_FINDING_BY_LINE], [])
            )
            code, rows, notes = measure([run_dir], evidence)
            if len(rows) != 1:
                return f"{len(rows)} rows, expected 1: {notes}"
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
                return f"exit {code}, expected 0"
            reported = [note for note in notes if "\tscaffolding-skipped\t" in note]
            if len(reported) != 1 or "Two blockers" not in reported[0]:
                return f"expected the lead bullet as the one skip reported: {notes}"
            return ""

        def fixture_ranges_unique() -> str:
            # The eight regions the brief's Step 3 declares, resolved against
            # the real fixture. A start pattern that matches twice is drift the
            # instrument cannot absorb; the END pattern keeps its
            # first-match-after-the-start semantics, because `log_rethrow`'s
            # `^\}` legitimately matches many lines.
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING]))
            want = {
                "offset_bug": (18, 18),
                "unawaited_save": (37, 37),
                "with_retry": (7, 20),
                "parse_order_id": (21, 26),
                "config_readfile": (6, 10),
                "store_slice": (5, 8),
                "log_rethrow": (25, 28),
                "test_fixture": (8, 20),
            }
            got = {key: (span.start, span.end) for key, span in resolve_ranges(run_dir).items()}
            if got != want:
                return f"the real fixture resolves to {got}, expected {want}"
            twice = (
                "async function withRetry(a) {\n}\n"
                "async function withRetry(b) {\n}\n"
                "const ORDER_ID = /^ord_/;\n"
            )
            try:
                span = locate(
                    "with_retry", "src/util.js", twice, r"^async function withRetry", r"^const ORDER_ID"
                )
            except RunError as error:
                if error.kind != "fixture-unresolved":
                    return f"a duplicated start raised {error.kind}, expected fixture-unresolved"
            else:
                return f"a duplicated start resolved silently to {span.start}-{span.end}"
            ends = "  } catch (err) {\n    log.error('list failed', err);\n  }\n}\n"
            span = locate("log_rethrow", "src/handlers.js", ends, r"^\s*\} catch \(err\) \{", r"^\}")
            if (span.start, span.end) != (1, 3):
                return f"the end pattern no longer takes its first match: {span.start}-{span.end}"
            return ""

        def arm_log_not_validated() -> str:
            # analyze.py rejects a log whose header or DONE line disagrees with
            # its file name. A log this script accepts and that one rejects is
            # two answers for one trial, and an arm mix-up inverts the
            # comparison the campaign exists to make.
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING]))
            good = f"arm=treatment scenario={SCENARIO} repeat=1 proc=p1 budget=default"
            variants: tuple[tuple[str, str | None, str | None], ...] = (
                ("header arm", good.replace("arm=treatment", "arm=control"), None),
                ("header scenario", good.replace(f"scenario={SCENARIO}", "scenario=other"), None),
                ("header proc", good.replace("proc=p1", "proc=p2"), None),
                ("no header", "", None),
                ("last line", None, f"FAILED treatment {SCENARIO} p1"),
            )
            for index, (label, header, last) in enumerate(variants):
                where = os.path.join(root, f"arm-{index}")
                os.makedirs(where, exist_ok=True)
                write_launch_log(where, "treatment", run_dir, header=header, last=last)
                code, rows, notes = measure([run_dir], where, None)
                if rows:
                    return f"{label}: {len(rows)} rows, expected none"
                if code == 0:
                    return f"{label}: exit 0, expected non-zero"
                if not any("\tarm-unresolved\t" in note for note in notes):
                    return f"{label}: no arm-unresolved line in {notes}"
            return ""

        def arm_named_twice() -> str:
            # Two valid logs, one per arm, both recording this run. Taking
            # either would be a coin flip on the column the analysis groups by.
            run_dir = run(build_report([OFFSET_FINDING], [SAVE_FINDING]))
            where = os.path.join(root, "arm-both")
            os.makedirs(where, exist_ok=True)
            write_launch_log(where, "control", run_dir)
            write_launch_log(where, "treatment", run_dir)
            code, rows, notes = measure([run_dir], where, None)
            if rows:
                return f"{len(rows)} rows, expected none"
            if code == 0:
                return "exit 0, expected non-zero"
            if not any("\tarm-unresolved\t" in note for note in notes):
                return f"no arm-unresolved line in {notes}"
            return ""

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
            ("identifier_beats_prose", identifier_beats_prose),
            ("name_collision_unattributed", name_collision_unattributed),
            ("name_alternatives", name_alternatives),
            ("literal_not_english", literal_not_english),
            ("clean_hunk_named_but_unplaceable", clean_hunk_named_but_unplaceable),
            ("cited_out_of_range_names_a_hunk", cited_out_of_range_names_a_hunk),
            ("unnumbered_bullets", unnumbered_bullets),
            ("mixed_list_markers", mixed_list_markers),
            ("numbered_finding_keeps_its_bullets", numbered_finding_keeps_its_bullets),
            ("unrecognized_finding_before_the_first", unrecognized_finding_before_the_first),
            ("fenced_snippet_before_the_first_finding", fenced_snippet_before_the_first_finding),
            ("section_preamble_is_not_a_finding", section_preamble_is_not_a_finding),
            ("scaffolding_bullet_is_reported", scaffolding_bullet_is_reported),
            (
                "scaffolding_note_stays_off_the_real_shape",
                scaffolding_note_stays_off_the_real_shape,
            ),
            (
                "bullet_only_section_reports_a_later_merge",
                bullet_only_section_reports_a_later_merge,
            ),
            (
                "scaffolding_note_only_where_a_count_could_move",
                scaffolding_note_only_where_a_count_could_move,
            ),
            ("nested_heading_findings_are_counted", nested_heading_findings_are_counted),
            (
                "a_shallower_heading_does_not_open_a_finding",
                a_shallower_heading_does_not_open_a_finding,
            ),
            (
                "a_label_opened_section_still_closes_on_any_heading",
                a_label_opened_section_still_closes_on_any_heading,
            ),
            (
                "a_heading_titled_finding_keeps_its_bullets",
                a_heading_titled_finding_keeps_its_bullets,
            ),
            (
                "a_remediation_subheading_is_not_a_second_finding",
                a_remediation_subheading_is_not_a_second_finding,
            ),
            (
                "disclosure_sevens_shape_now_reads_as_one_finding",
                disclosure_sevens_shape_now_reads_as_one_finding,
            ),
            (
                "a_deeper_heading_before_the_first_finding_fails_closed",
                a_deeper_heading_before_the_first_finding_fails_closed,
            ),
            (
                "a_bold_numbered_section_keeps_its_remediation_subheading",
                a_bold_numbered_section_keeps_its_remediation_subheading,
            ),
            (
                "a_same_depth_unnumbered_heading_is_not_a_finding",
                a_same_depth_unnumbered_heading_is_not_a_finding,
            ),
            (
                "a_numbered_subheading_under_bold_titles_is_not_a_finding",
                a_numbered_subheading_under_bold_titles_is_not_a_finding,
            ),
            ("unnumbered_heading_titles_fail_closed", unnumbered_heading_titles_fail_closed),
            (
                "a_heading_ahead_of_bold_titles_fails_closed",
                a_heading_ahead_of_bold_titles_fails_closed,
            ),
            (
                "a_numbered_subheading_under_heading_titles_is_not_a_finding",
                a_numbered_subheading_under_heading_titles_is_not_a_finding,
            ),
            ("a_folded_numbered_heading_is_reported", a_folded_numbered_heading_is_reported),
            ("a_folded_unnumbered_heading_is_reported", a_folded_unnumbered_heading_is_reported),
            (
                "a_heading_in_a_minor_finding_is_not_reported",
                a_heading_in_a_minor_finding_is_not_reported,
            ),
            (
                "a_title_or_fenced_heading_is_not_reported_as_folded",
                a_title_or_fenced_heading_is_not_reported_as_folded,
            ),
            (
                "a_remediation_citation_that_contradicts_the_named_bug_is_reported",
                a_remediation_citation_that_contradicts_the_named_bug_is_reported,
            ),
            (
                "a_citation_that_agrees_with_its_name_is_not_reported",
                a_citation_that_agrees_with_its_name_is_not_reported,
            ),
            (
                "a_citation_covering_the_named_bug_and_a_hunk_is_not_a_conflict",
                a_citation_covering_the_named_bug_and_a_hunk_is_not_a_conflict,
            ),
            (
                "a_citation_conflict_in_a_minor_finding_is_not_reported",
                a_citation_conflict_in_a_minor_finding_is_not_reported,
            ),
            (
                "a_finding_placed_by_name_is_not_a_conflict",
                a_finding_placed_by_name_is_not_a_conflict,
            ),
            (
                "a_citation_path_is_not_read_as_a_name",
                a_citation_path_is_not_read_as_a_name,
            ),
            (
                "a_severity_lettered_number_opens_a_finding",
                a_severity_lettered_number_opens_a_finding,
            ),
            (
                "a_severity_lettered_heading_titles_a_finding",
                a_severity_lettered_heading_titles_a_finding,
            ),
            (
                "bold_title_bullets_open_findings_where_nothing_is_numbered",
                bold_title_bullets_open_findings_where_nothing_is_numbered,
            ),
            (
                "colon_label_bullets_alone_still_fail_closed",
                colon_label_bullets_alone_still_fail_closed,
            ),
            (
                "a_title_bullet_ahead_of_numbers_stays_scaffolding",
                a_title_bullet_ahead_of_numbers_stays_scaffolding,
            ),
            ("fixture_ranges_unique", fixture_ranges_unique),
            ("two_clean_hunks", two_clean_hunks),
            ("proof_partial", proof_partial),
            ("proof_trigger_answers_read", proof_trigger_answers_read),
            ("no_subagent_log", no_subagent_log),
            ("fenced_heading_not_a_report", fenced_heading_not_a_report),
            ("proof_sidecar_missing", proof_sidecar_missing),
            ("proof_sidecar_invalid", proof_sidecar_invalid),
            ("grader_unreadable", grader_unreadable),
            ("bad_run_dir", bad_run_dir),
            ("arm_log_not_validated", arm_log_not_validated),
            ("arm_named_twice", arm_named_twice),
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
