"""Tally the compaction re-read notice campaign: control, treatment and shipped.

Usage::

    python3 tally.py                                   # every campaign log
    python3 tally.py --run RUN_ID --arm ARM --scenario NAME   # one run (smoke)

It exits 0, or 1 when ``sentinel-reruns.tsv`` (original, replacement; tab
separated) breaks a rule.

Spec: ``docs/hyperpowers/specs/2026-11-11-compaction-reread-notice-design.md``
in the hyperpowers repository, Testing and Evidence section. Three arms:
``control`` (B, the pin-only commit that removes the "After every context
compaction" paragraph from SDD and brainstorming), ``treatment`` (B plus the
notice) and ``shipped`` (the slice commit: the notice on top of ``main``, with
the paragraph). Two scenarios: ``sdd-compaction-reread`` (control, treatment
and shipped) and ``compaction-no-skill`` (treatment only, the sentinel).

Reads ``logs/<arm>-<scenario>-<proc>.log`` (proc ``p1``-``p10`` or
``r1``-``r3``), the run ids (``run-id: ...``) inside each, the run's
``verdict.json`` and its main transcripts (``home/.claude/projects/*/*.jsonl``,
subagent transcripts excluded), found in ``task-6-runs/<arm>/`` or in
``results/``, each with a sibling ``workspaces/<id>/``.

Rules:

* A log whose last line is not ``DONE ...`` (a ``FAILED <code>`` line or no
  terminal line) never yields a valid trial: the run is void, kind ``launch``.
* A log with more than one run id is one void ``multi-run`` row; none of its
  runs counts. A log name outside p1-p10 / r1-r3 is reported and not counted.
  An errored Agent tool_result is not a completion.
* A setup or grader void in the verdict is void; so is a run whose reading is
  invalid (kind ``instrument``): an invalid run is a void. Voids occupy no
  trial slot.
* Re-read counting credits only the lines the session saw, and fails closed:
  when the tally cannot establish that the session saw the text, it gives no
  SDD credit. An SDD re-read is a successful Read, or a plain ``cat``, of the
  skill's ``SKILL.md`` after a compaction and before the next stop event (the
  next Agent dispatch or compaction). It counts where its non-error tool
  result arrives, and only when the union of the line ranges read covers the
  cut text: from the line holding character 20,000 of the arm's pinned
  ``SKILL.md`` (where Claude Code's re-attached copy ends) to the last line.
  Whole-file reads and offset reads that cover the cut text both count, and
  are reported separately (``followed`` and ``whole``).
* A Read that Claude Code cut at its 25,000-token cap (a following
  ``read_truncation_notice`` attachment) counts only the range its banner
  shows, ``lines A-B``, and is not whole. The notice is matched to a Read by
  its ``parentUuid`` first, then by path. A banner that does not parse
  removes all credit from the Read it targets (by parent, else a Read whose
  path the banner names, else the most recent credited Read) and is counted
  as ``truncation_unparsed``; a parsed banner that matches no Read removes
  all credit from the most recent credited Read of the skill its path names,
  else from the most recent credited Read, and is counted as
  ``truncation_unmatched``. Both warn on stderr and show on the run line.
* A shell read is recognized only where a reader actually runs and its
  stdout reaches the session. The command is split, quote-aware, into simple
  commands on ``;``, ``&&``, ``||``, ``|``, ``&`` and newlines, skipping
  here-document bodies; one that cannot be tokenized (an unbalanced quote or
  substitution, an unterminated here-document) reads nothing. In each,
  the command word after any ``VAR=value`` assignments must be ``cat``,
  ``head``, ``tail``, ``less``, ``more`` or ``sed -n``, the ``SKILL.md`` path
  must be a non-option argument, and stdout must not be redirected (``>``,
  ``>>``, ``>|``, ``&>``, ``1>``; ``2>&1`` and ``2>/dev/null`` are fine). A
  command inside ``$( )``, backticks or a process substitution, and a path
  merely mentioned by ``echo``, ``printf`` or a quoted argument, is not a
  read. Only a command that is exactly ``cat <path>`` (optionally ``2>&1``)
  is a plain ``cat``, and it gets no SDD credit when Claude Code persisted its
  output to a file (``<persisted-output>``, a 2 KB preview). Every other
  shell read (``cat -n``, a piped or compound ``cat``, ``head``, ``tail``,
  ``sed -n``, ``less``, ``more``) gets no SDD credit.
* SDD validity (the 6.16.2 rule): an automatic compaction falls after task 1's
  review returns and before the first final review is dispatched; the first
  such compaction is the measured one. Outcome passes when every task whose
  review had not completed before the compaction has a review completing after
  it, the final review completes before the finishing skill is invoked, no
  implementer finished before the compaction is dispatched again (takeover
  dispatches excepted), and quorum's post checks all passed. Mechanism passes
  when the cut text is re-read after the measured compaction and before the
  next dispatch.
* SDD per-compaction: every automatic compaction after the SDD skill load
  counts; it is ``followed`` when it is re-read before the next dispatch or
  compaction, and ``whole`` when one of those reads had no offset and no
  limit. Rates pool followed over compactions across valid runs.
* compaction-no-skill validity: an automatic compaction lands before the
  session's last reply, and no skill is invoked before the first compaction.
  A valid run fails when, after the first compaction, it reads the
  ``SKILL.md`` of a skill it never invoked, by Read or by any of the shell
  readers above, persisted or not, since the attempt is the failure;
  ``using-hyperpowers`` is exempt because the bootstrap injects it. Gauntlet
  outcome is not used.
* A replacement (``sentinel-reruns.tsv``) may replace only a void, in the same
  arm and scenario, at most three per cell; the replacement counts.

Bars, verbatim from the spec: SDD control/treatment: treatment mechanism at
least 8 of 10; treatment per-compaction rate at least 85%; treatment outcome at
least the control's. A control mechanism above 3 of 10 stops the campaign for a
decision. Shipped: outcome at least 9 of 10; per-compaction rate at least 90%;
median compactions per run at most 16. Sentinel: at most 1 of 10 valid runs
fail. A cell with fewer than ten valid runs reads ``incomplete``.

``void_kind``, ``post_check``, ``sdd_reading`` and the log parsing are adapted
from ../2026-11-03-cost-reduction-6-16-2/tally.py.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
EVALS = HERE.parents[1]
HP_REPO = EVALS.parent
SDD = "sdd-compaction-reread"
NOSKILL = "compaction-no-skill"
RUN_ROOTS: tuple[str, ...] = ("task-6-runs",)
NOTIF_ID = re.compile(r"<tool-use-id>([^<]+)</tool-use-id>")
NOTIF_STATUS = re.compile(r"<status>([^<]+)</status>")
# Shell operators, longest first so ``&&`` is not read as two ``&``. A
# separator ends one simple command; a redirection takes the next word as its
# target.
SHELL_OPERATORS = (
    "&>>", ";;", "&&", "||", "|&", "&>", ">>", ">|", ">&", "<<<", "<<-", "<<", "<&", "<>",
    ";", "|", "&", "\n", "(", ")", ">", "<",
)
REDIRECTIONS = frozenset({"&>>", "&>", ">>", ">|", ">&", "<<<", "<<-", "<<", "<&", "<>", ">", "<"})
# The shell commands that print a file to stdout. ``sed`` prints only with
# ``-n`` and an address; without it the tally cannot tell an edit from a read.
READERS = frozenset({"cat", "head", "tail", "less", "more", "sed"})
ASSIGNMENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]*=")
# Claude Code 2.1.317 cuts a Read over 25,000 tokens and writes this banner in
# a separate attachment entry; the separator is an em dash.
TRUNCATION_BANNER = re.compile(r"PARTIAL view \u2014 (.+): showing lines (\d+)-(\d+) of (\d+) total")
PERSISTED = "<persisted-output>"
SKILL_PATH = re.compile(r"/skills/([^/]+)/SKILL\.md$")


def run_paths(arm: str, run_id: str) -> tuple[Path, list[Path]]:
    """Locate a run's record and main transcripts, archived or live, relocated or legacy.

    :param arm: ``control``, ``treatment`` or ``shipped``.
    :param run_id: The quorum run id.
    :returns: The directory holding ``verdict.json`` and the sorted transcript paths.
    :raises FileNotFoundError: When no root holds the run.
    """
    bases = [HERE / root / arm for root in RUN_ROOTS] + [EVALS / "results"]
    for base in bases:
        record = base / run_id
        if (record / "verdict.json").is_file():
            workspace = base / "workspaces" / run_id
            home_root = workspace if (workspace / "home").is_dir() else record
            return record, sorted(home_root.glob("home/.claude/projects/*/*.jsonl"))
    raise FileNotFoundError(f"no record for run {run_id} under {[str(b) for b in bases]}")


def classify(description: str, prompt: str) -> tuple[str, int | None]:
    """Classify an Agent dispatch as implement/review/rereview/fix/final/other with its task number."""
    for kind, pattern in (
        ("implement", r"\s*Implement Task (\d+)"),
        ("rereview", r"\s*Re-review Task (\d+)"),
        ("review", r"\s*Review Task (\d+)"),
        ("fix", r"\s*Fix findings for Task (\d+)"),
    ):
        match = re.match(pattern, description or "")
        if match:
            return kind, int(match.group(1))
    match = re.match(r"\s*You are implementing Task (\d+)", prompt or "")
    if match:
        return "implement", int(match.group(1))
    if (
        (re.search(r"final", description or "", re.IGNORECASE) and re.search(r"review", description, re.IGNORECASE))
        or description == "Review code changes"
        or (prompt or "").lstrip().startswith("You are a Senior Code Reviewer")
    ):
        return "final", None
    return "other", None


def notified_ids(text: str) -> list[str]:
    """Tool-use ids of every completed notification in ``text`` (batched ones included)."""
    ids: list[str] = []
    for chunk in text.split("<task-notification>")[1:]:
        ident, status = NOTIF_ID.search(chunk), NOTIF_STATUS.search(chunk)
        if ident and (status is None or status.group(1) == "completed"):
            ids.append(ident.group(1))
    return ids


def result_text(content: Any) -> str:
    """The text of a tool_result's content, a string or a list of text blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(str(b.get("text") or "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def apply_truncation(found: list[dict[str, Any]], parent: Any, banner: str) -> None:
    """Narrow a Read that Claude Code cut at its token cap to the lines the banner says it showed.

    The notice is matched to the most recent Read whose result entry is the
    notice's parent, preferring one with the banner's path, and falls back to
    the most recent Read of that path. A matched read keeps its credit for
    ``lines A-B`` only. Both failures fail closed and append a counted
    ``note`` event: a banner that does not parse removes the credit of the
    Read it targets (by parent, else a Read whose path the banner names, else
    the most recent credited Read), ``truncation_unparsed``; a parsed banner
    that matches no Read removes the credit of the most recent credited Read
    of the skill its path names, else of the most recent credited Read,
    ``truncation_unmatched``. Each warns on stderr.
    """
    reads = [e for e in found if e["kind"] == "read" and e["via"] == "read"]
    # The parent link is exact even when the banner writes the path another
    # way (a symlink, a relative path) or does not parse at all.
    parented = [e for e in reads if parent and e.get("uuid") == parent]
    match = TRUNCATION_BANNER.search(banner)
    if match is None:
        named = [e for e in reads if e["path"] and e["path"] in banner]
        credited = [e for e in reads if e["credited"]]
        targets = parented or named or credited
        found.append({"kind": "note", "note": "truncation_unparsed"})
        if targets:
            targets[-1].update(credited=False, whole=False, truncation_unparsed=True)
        where = targets[-1]["path"] if targets else "no read"
        print(f"tally: truncation_unparsed: credit removed ({where}): {banner[:120]!r}", file=sys.stderr)
        return
    path, first, last = match.group(1), int(match.group(2)), int(match.group(3))
    same = [e for e in reads if e["path"] == path]
    both = [e for e in parented if e["path"] == path]
    candidates = both or parented or same
    if not candidates:
        # Some Read was cut and the tally cannot tell which, so a Read keeps
        # no credit it cannot verify. The banner may write the path another
        # way (a symlink), so the skill name is the best remaining link.
        credited = [e for e in reads if e["credited"]]
        named_skill = SKILL_PATH.search(path)
        same_skill = [
            e for e in credited
            if named_skill and (m := SKILL_PATH.search(e["path"])) and m.group(1) == named_skill.group(1)
        ]
        targets = same_skill or credited
        found.append({"kind": "note", "note": "truncation_unmatched"})
        if targets:
            targets[-1].update(credited=False, whole=False, truncation_unmatched=True)
        where = targets[-1]["path"] if targets else "no read"
        print(f"tally: truncation_unmatched: credit removed ({where}): {banner[:120]!r}", file=sys.stderr)
        return
    candidates[-1].update(offset=first, limit=last - first + 1, whole=False)


def _substitution_end(command: str, start: int) -> int:
    """The index just past the ``)`` closing the substitution whose ``(`` is at ``start``.

    :raises ValueError: When the substitution is not closed.
    """
    depth, i = 0, start
    while i < len(command):
        ch = command[i]
        if ch == "\\":
            i += 2
            continue
        if ch == "'":
            close = command.find("'", i + 1)
            if close < 0:
                raise ValueError("unbalanced quote")
            i = close + 1
            continue
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError("unbalanced substitution")


def _backtick_end(command: str, start: int) -> int:
    """The index just past the backtick closing the one at ``start``.

    :raises ValueError: When the backtick is not closed.
    """
    i = start + 1
    while i < len(command):
        if command[i] == "\\":
            i += 2
            continue
        if command[i] == "`":
            return i + 1
        i += 1
    raise ValueError("unbalanced backtick")


def _heredoc_end(command: str, start: int, heredocs: list[tuple[str, bool]]) -> int:
    """The index just past the delimiter line of the last of ``heredocs``, whose bodies begin at ``start``.

    :raises ValueError: When a body has no delimiter line.
    """
    i = start
    for delimiter, strip_tabs in heredocs:
        while True:
            if i >= len(command):
                raise ValueError("unterminated here-document")
            newline = command.find("\n", i)
            end = len(command) if newline < 0 else newline
            line = command[i:end]
            i = end + 1
            if (line.lstrip("\t") if strip_tabs else line) == delimiter:
                break
    return min(i, len(command))


def shell_tokens(command: str) -> list[tuple[str, str, bool]]:
    """Split a shell command into words and operators, quote-aware.

    Quotes are removed from words. A word holding a ``$( )``, backtick or
    process substitution is marked hidden: what runs inside it never reaches
    the session directly. A redirection's file descriptor is folded into its
    operator (``2>``). A here-document's body is stdin, not commands, so it is
    skipped up to its delimiter line.

    :param command: The Bash tool's command string.
    :returns: ``(kind, text, hidden)`` tuples, ``kind`` being ``word`` or ``op``.
    :raises ValueError: On an unbalanced quote or substitution, or a
        here-document with no delimiter word or no delimiter line.
    """
    tokens: list[tuple[str, str, bool]] = []
    word: list[str] = []
    in_word = hidden = quoted = False
    # ``want_delimiter`` holds the ``<<-`` tab-stripping flag while the next
    # word is awaited as a delimiter; bodies start after the line ends.
    want_delimiter: bool | None = None
    heredocs: list[tuple[str, bool]] = []

    def flush() -> None:
        nonlocal word, in_word, hidden, quoted, want_delimiter
        if in_word:
            tokens.append(("word", "".join(word), hidden))
            if want_delimiter is not None:
                heredocs.append(("".join(word), want_delimiter))
                want_delimiter = None
        word, in_word, hidden, quoted = [], False, False, False

    i, n = 0, len(command)
    while i < n:
        ch = command[i]
        if ch in " \t\r":
            flush()
            i += 1
        elif ch == "#" and not in_word:
            newline = command.find("\n", i)
            i = n if newline < 0 else newline
        elif (ch == "$" and command.startswith("$(", i)) or (ch in "<>" and command.startswith("(", i + 1)):
            end = _substitution_end(command, i + 1)
            word.append(command[i:end])
            in_word = hidden = True
            i = end
        elif ch == "`":
            end = _backtick_end(command, i)
            word.append(command[i:end])
            in_word = hidden = True
            i = end
        elif ch == "\\":
            if i + 1 >= n:
                raise ValueError("trailing backslash")
            if command[i + 1] != "\n":
                word.append(command[i + 1])
                in_word = quoted = True
            i += 2
        elif ch == "'":
            close = command.find("'", i + 1)
            if close < 0:
                raise ValueError("unbalanced quote")
            word.append(command[i + 1:close])
            in_word = quoted = True
            i = close + 1
        elif ch == '"':
            i += 1
            while True:
                if i >= n:
                    raise ValueError("unbalanced quote")
                c = command[i]
                if c == '"':
                    i += 1
                    break
                if c == "\\" and i + 1 < n:
                    word.append(command[i + 1] if command[i + 1] in '$`"\\\n' else command[i:i + 2])
                    i += 2
                elif c == "$" and command.startswith("$(", i):
                    end = _substitution_end(command, i + 1)
                    word.append(command[i:end])
                    hidden = True
                    i = end
                elif c == "`":
                    end = _backtick_end(command, i)
                    word.append(command[i:end])
                    hidden = True
                    i = end
                else:
                    word.append(c)
                    i += 1
            in_word = quoted = True
        else:
            op = next((o for o in SHELL_OPERATORS if command.startswith(o, i)), None)
            if op is None:
                word.append(ch)
                in_word = True
                i += 1
                continue
            fd = ""
            if op in REDIRECTIONS and in_word and not quoted and not hidden and "".join(word).isdigit():
                fd, word, in_word = "".join(word), [], False
            flush()
            if want_delimiter is not None:
                raise ValueError("here-document without a delimiter")
            tokens.append(("op", fd + op, False))
            i += len(op)
            if op in ("<<", "<<-"):
                want_delimiter = op == "<<-"
            elif op == "\n" and heredocs:
                i = _heredoc_end(command, i, heredocs)
                heredocs.clear()
    flush()
    if want_delimiter is not None or heredocs:
        raise ValueError("unterminated here-document")
    return tokens


def stdout_redirected(redirects: list[tuple[str, str]]) -> bool:
    """Whether a simple command's redirections send its stdout anywhere but the session.

    ``2>&1``, ``2>/dev/null`` and ``>&2`` leave stdout visible: Claude Code
    shows stderr too.
    """
    for op, target in redirects:
        fd = op[: len(op) - len(op.lstrip("0123456789"))]
        base = op[len(fd):]
        if base in ("&>", "&>>"):
            return True
        if fd in ("", "1") and (base in (">", ">>", ">|") or (base == ">&" and target not in ("1", "2"))):
            return True
    return False


def shell_segments(command: str) -> list[dict[str, Any]] | None:
    """The simple commands of a shell command, or None when it cannot be tokenized.

    Each segment holds ``words`` (``(text, hidden)`` pairs), ``redirects``
    (``(operator, target)`` pairs), ``grouped`` (inside a ``( )`` subshell)
    and ``hidden_output`` (the subshell's stdout is redirected away).
    """
    try:
        tokens = shell_tokens(command)
    except ValueError:
        return None
    segments: list[dict[str, Any]] = []
    groups: list[int] = []

    def fresh(closes: int | None = None) -> dict[str, Any]:
        return {"words": [], "redirects": [], "grouped": bool(groups), "hidden_output": False, "closes": closes}

    current = fresh()
    target_of: str | None = None
    for kind, text, hidden in tokens:
        if target_of is not None:
            if kind != "word":
                return None
            current["redirects"].append((target_of, text))
            target_of = None
        elif kind == "word":
            current["words"].append((text, hidden))
        elif text.lstrip("0123456789") in REDIRECTIONS:
            target_of = text
        else:
            # A redirection after ``)`` applies to every command in the group.
            if current["closes"] is not None and stdout_redirected(current["redirects"]):
                for segment in segments[current["closes"]:]:
                    segment["hidden_output"] = True
            if current["words"] or current["redirects"]:
                segments.append(current)
            closes = None
            if text == "(":
                groups.append(len(segments))
            elif text == ")":
                if not groups:
                    return None
                closes = groups.pop()
            current = fresh(closes)
    if target_of is not None or groups:
        return None
    if current["closes"] is not None and stdout_redirected(current["redirects"]):
        for segment in segments[current["closes"]:]:
            segment["hidden_output"] = True
    if current["words"] or current["redirects"]:
        segments.append(current)
    return segments


def segment_skill_reads(segment: dict[str, Any]) -> list[str]:
    """The ``SKILL.md`` paths a simple command prints to the session.

    The command word, after any leading ``VAR=value`` assignments, must be a
    reader (``sed`` only with ``-n`` and never with ``-i``), its stdout must
    reach the session, and the path must be one of its non-option arguments
    outside any substitution.
    """
    if segment["hidden_output"] or stdout_redirected(segment["redirects"]):
        return []
    words = segment["words"]
    k = 0
    while k < len(words) and ASSIGNMENT.match(words[k][0]):
        k += 1
    if k >= len(words) or words[k][1]:
        return []
    name = words[k][0].rsplit("/", 1)[-1]
    if name not in READERS:
        return []
    options: list[str] = []
    operands: list[str] = []
    ended = False
    for text, hidden in words[k + 1:]:
        if not ended and text == "--":
            ended = True
        elif not ended and text.startswith("-") and len(text) > 1:
            options.append(text)
        elif not hidden:
            operands.append(text)
    if name == "sed" and (
        not any(o in ("-n", "--quiet", "--silent") for o in options)
        or any(o.startswith(("-i", "--in-place")) for o in options)
    ):
        return []
    return [text for text in operands if SKILL_PATH.search(text)]


def shell_skill_reads(command: str) -> list[tuple[str, str]]:
    """The ``SKILL.md`` reads a Bash command shows the session, each with its ``via``.

    Only a command that is exactly ``cat <path>`` (optionally ``2>&1``) is
    ``cat``, which may earn SDD credit; every other reader is ``bash-other``,
    a sentinel read with no SDD credit. A command that cannot be tokenized
    reads nothing.

    :param command: The Bash tool's command string.
    :returns: ``(path, via)`` pairs in command order.
    """
    segments = shell_segments(command)
    if segments is None:
        return []
    paths = [path for segment in segments for path in segment_skill_reads(segment)]
    if len(segments) == 1 and len(paths) == 1:
        only = segments[0]
        if (
            not only["grouped"]
            and [text for text, _ in only["words"]] == ["cat", paths[0]]
            and only["redirects"] in ([], [("2>&", "1")])
        ):
            return [(paths[0], "cat")]
    return [(path, "bash-other") for path in paths]


def events(transcripts: list[Path]) -> list[dict[str, Any]]:
    """Main-thread events in file order: compact, dispatch, done, read, skill, ask, reply, note.

    A ``read`` carries ``via`` (``read``, ``cat`` or ``bash-other``),
    ``persisted`` (Claude Code moved the Bash output to a file and showed a
    2 KB preview) and ``credited`` (it may count as SDD coverage: a Read, or a
    plain ``cat`` whose output was not persisted, and not stripped by an
    unparsable or unmatched truncation banner). A Bash command emits one ``read`` per
    ``SKILL.md`` it shows. A ``note`` (``truncation_unparsed`` or
    ``truncation_unmatched``) records a truncation notice the tally could not
    apply.
    """
    found: list[dict[str, Any]] = []
    # A Read counts where its result arrives: calls composed in the same
    # message as the Read were chosen before the model saw the file.
    pending_reads: dict[str, list[tuple[str, Any, Any, str]]] = {}
    for path in transcripts:
        for line in path.read_text(encoding="utf-8").splitlines():
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(entry, dict) or entry.get("isSidechain"):
                continue
            if (
                entry.get("type") == "system"
                and entry.get("subtype") == "compact_boundary"
                and (entry.get("compactMetadata") or {}).get("trigger") == "auto"
            ):
                found.append({"kind": "compact"})
                continue
            message = entry.get("message") or {}
            content = message.get("content") if isinstance(message, dict) else None
            if entry.get("type") == "assistant" and isinstance(content, list):
                blocks = [b for b in content if isinstance(b, dict)]
                if not any(b.get("type") == "tool_use" for b in blocks) and any(
                    b.get("type") == "text" and str(b.get("text") or "").strip() for b in blocks
                ):
                    found.append({"kind": "reply"})
                for block in content:
                    if not isinstance(block, dict) or block.get("type") != "tool_use":
                        continue
                    name, args = block.get("name"), block.get("input") or {}
                    if name in ("Agent", "Task"):
                        kind, task = classify(str(args.get("description") or ""), str(args.get("prompt") or ""))
                        description, prompt = str(args.get("description") or ""), str(args.get("prompt") or "")
                        # SDD's fix rounds 4-5 hand the task to a fresh
                        # implementer that legitimately re-implements it.
                        takeover = (
                            "takeover" in description.lower()
                            or "prior implementer attempted" in prompt
                            or "you own it now" in prompt
                        )
                        found.append(
                            {"kind": "dispatch", "class": kind, "task": task, "id": block.get("id"), "takeover": takeover}
                        )
                    elif name == "Read":
                        pending_reads[str(block.get("id"))] = [
                            (str(args.get("file_path") or ""), args.get("offset"), args.get("limit"), "read")
                        ]
                    elif name == "Skill":
                        found.append({"kind": "skill", "skill": str(args.get("skill") or "")})
                    elif name == "AskUserQuestion":
                        found.append({"kind": "ask"})
                    elif name == "Bash":
                        shown = shell_skill_reads(str(args.get("command") or ""))
                        if shown:
                            pending_reads[str(block.get("id"))] = [(p, None, None, via) for p, via in shown]
            elif entry.get("type") == "attachment":
                attachment = entry.get("attachment") or {}
                if attachment.get("type") == "read_truncation_notice":
                    apply_truncation(found, entry.get("parentUuid"), str(attachment.get("banner") or ""))
                # A notification that lands while the controller is mid-turn is
                # delivered as a queued_command attachment, not a user message.
                queued = attachment.get("prompt") if attachment.get("type") == "queued_command" else None
                if isinstance(queued, str):
                    found.extend({"kind": "done", "id": i} for i in notified_ids(queued))
            elif entry.get("type") == "user":
                result = entry.get("toolUseResult")
                structured_launch = isinstance(result, dict) and result.get("status") == "async_launched"
                if isinstance(content, list):
                    for block in content:
                        if (
                            not isinstance(block, dict)
                            or block.get("type") != "tool_result"
                            or block.get("is_error")
                        ):
                            continue
                        ident = str(block.get("tool_use_id"))
                        if ident in pending_reads:
                            for path_read, offset, limit, via in pending_reads.pop(ident):
                                # Output over 30,000 characters is saved to a
                                # file and the session sees a 2 KB preview.
                                persisted = via != "read" and PERSISTED in result_text(block.get("content"))
                                credited = via == "read" or (via == "cat" and not persisted)
                                found.append({
                                    "kind": "read", "path": path_read, "offset": offset, "limit": limit,
                                    "whole": credited and offset is None and limit is None,
                                    "via": via, "persisted": persisted, "credited": credited,
                                    "uuid": entry.get("uuid"),
                                })
                        # A launch is never a completion; the structured marker
                        # is primary and the text is the fallback.
                        elif not structured_launch and "Async agent launched" not in json.dumps(
                            block.get("content")
                        ):
                            found.append({"kind": "done", "id": ident})
                text = content if isinstance(content, str) else json.dumps(content)
                found.extend({"kind": "done", "id": i} for i in notified_ids(text))
    return found


def sdd_reading(found: list[dict[str, Any]], cut: tuple[int, int]) -> dict[str, Any]:
    """Validity, outcome and mechanism for one SDD trial (rules in the module docstring).

    :param found: The run's events.
    :param cut: ``(cut_line, last_line)`` of the arm's SDD ``SKILL.md``.
    :returns: ``valid``, ``outcome`` and ``mechanism``.
    """
    dispatches = {e["id"]: e for e in found if e["kind"] == "dispatch"}
    index_of = {e["id"]: i for i, e in enumerate(found) if e["kind"] == "dispatch"}
    done_at: dict[str, int] = {}
    for i, e in enumerate(found):
        if e["kind"] == "done" and e["id"] in dispatches and e["id"] not in done_at:
            done_at[e["id"]] = i
    review1_done = min(
        (done_at[k] for k, d in dispatches.items() if d["class"] == "review" and d["task"] == 1 and k in done_at),
        default=None,
    )
    final_at = next((i for i, e in enumerate(found) if e["kind"] == "dispatch" and e["class"] == "final"), None)
    compact = next(
        (
            i for i, e in enumerate(found)
            if e["kind"] == "compact"
            and review1_done is not None
            and review1_done < i
            and (final_at is None or i < final_at)
        ),
        None,
    )
    if compact is None:
        return {"valid": False, "outcome": None, "mechanism": None}
    valid = True
    reading: dict[str, Any] = {"valid": valid, "outcome": None, "mechanism": None}
    if not valid:
        return reading
    done_before: set[int] = set()
    for task in (1, 2, 3, 4):
        reviews = [
            k for k, d in dispatches.items()
            if d["class"] in ("review", "rereview") and d["task"] == task and index_of[k] < compact
        ]
        if not reviews:
            continue
        last = max(reviews, key=lambda k: index_of[k])
        if last not in done_at or done_at[last] > compact:
            continue
        refixed = any(
            d["class"] == "fix" and d["task"] == task and done_at[last] < index_of[k] < compact
            for k, d in dispatches.items()
        )
        if not refixed:
            done_before.add(task)
    after = found[compact + 1:]
    base = compact + 1
    # Any final review after the compaction may satisfy the finish condition
    # (a retry after an errored attempt counts); the earliest satisfying one
    # bounds which review dispatches count as "after".
    finish_idx = [
        i for i, e in enumerate(found)
        if i > compact and e["kind"] == "skill" and e["skill"].endswith("finishing-a-development-branch")
    ]
    final_ids = [
        k for k, d in dispatches.items() if d["class"] == "final" and index_of[k] > compact
    ]
    satisfying = sorted(
        index_of[k]
        for k in final_ids
        if k in done_at and any(done_at[k] < f for f in finish_idx)
    )
    finished = bool(satisfying)
    limit = satisfying[0] if satisfying else len(found)
    # A review that errored or never returned did not review anything. One
    # dispatched before the compaction counts when its completion lands after
    # it, but a task's review must return before the next task's implementer
    # is first dispatched, wherever that dispatch falls (the last task's
    # before the satisfying final review).
    def next_task_start(task: int) -> int:
        return min(
            (i for i, e in enumerate(found)
             if e["kind"] == "dispatch" and e["class"] == "implement" and e["task"] == task + 1),
            default=limit,
        )

    reviewed_after = {
        d["task"] for k, d in dispatches.items()
        if d["class"] in ("review", "rereview") and index_of[k] < limit
        and k in done_at and base <= done_at[k] < min(limit, next_task_start(d["task"]))
    }
    implemented_before = {
        d["task"] for k, d in dispatches.items()
        if d["class"] == "implement" and k in done_at and done_at[k] < compact
    }
    redispatch = any(
        e["kind"] == "dispatch" and e["class"] == "implement" and not e["takeover"]
        and (e["task"] in done_before or e["task"] in implemented_before)
        for e in after
    )
    reading["outcome"] = ({1, 2, 3, 4} - done_before) <= reviewed_after and finished and not redispatch
    first_dispatch = next((j for j, e in enumerate(after) if e["kind"] == "dispatch"), len(after))
    reading["mechanism"] = covers_cut(
        [
            e for e in after[:first_dispatch]
            if e["kind"] == "read" and e["credited"] and e["path"].endswith("subagent-driven-development/SKILL.md")
        ],
        cut,
    )
    return reading


def covers_cut(reads: list[dict[str, Any]], cut: tuple[int, int]) -> bool:
    """Whether the union of read line ranges covers lines ``cut[0]`` through ``cut[1]``.

    A read with no limit runs to the end of the file; a read with no offset
    starts at line 1; a ``cat`` is stored with neither. Callers pass only
    credited reads; a truncated Read already carries the banner's range.
    """
    first, last = cut
    spans = sorted(
        (r["offset"] or 1, last if r["limit"] is None else (r["offset"] or 1) + r["limit"] - 1) for r in reads
    )
    reached = first - 1
    for start, end in spans:
        if start > reached + 1:
            break
        reached = max(reached, end)
    return reached >= last


def compaction_follow(found: list[dict[str, Any]], cut: tuple[int, int]) -> dict[str, Any]:
    """How many automatic compactions after the SDD load were followed by a re-read of the cut text.

    :param found: The run's events.
    :param cut: ``(cut_line, last_line)`` of the arm's SDD ``SKILL.md``.
    :returns: ``compactions``, ``followed`` (reads covered the cut text) and ``whole`` (a whole-file read).
    """
    skill = "subagent-driven-development"
    load = next((i for i, e in enumerate(found) if e["kind"] == "skill" and e["skill"].endswith(skill)), None)
    result = {"compactions": 0, "followed": 0, "whole": 0}
    if load is None:
        return result
    for i, event in enumerate(found):
        if event["kind"] != "compact" or i <= load:
            continue
        result["compactions"] += 1
        stop = next((j for j in range(i + 1, len(found)) if found[j]["kind"] in ("dispatch", "compact")), len(found))
        reads = [
            e for e in found[i + 1:stop]
            if e["kind"] == "read" and e["credited"] and e["path"].endswith(f"{skill}/SKILL.md")
        ]
        result["followed"] += covers_cut(reads, cut)
        result["whole"] += any(e["whole"] for e in reads)
    return result


def manifest_pins() -> dict[str, str]:
    """The arm pins from the two-field ``control``, ``treatment`` and ``shipped`` rows of ``manifest.tsv``."""
    pins: dict[str, str] = {}
    for line in (HERE / "manifest.tsv").read_text(encoding="utf-8").splitlines():
        fields = line.split("\t")
        if len(fields) == 2 and fields[0] in ("control", "treatment", "shipped"):
            pins[fields[0]] = fields[1]
    return pins


def arm_cut(arm: str) -> tuple[int, int]:
    """``(cut_line, last_line)`` for the arm's pinned SDD ``SKILL.md``.

    The cut line is the line holding character 20,000 of the file, where
    Claude Code's re-attached copy ends; it is read from the pinned commit in
    the hyperpowers repository, never from a live checkout.
    """
    pin = manifest_pins()[arm]
    text = subprocess.run(
        ["git", "-C", str(HP_REPO), "show", f"{pin}:skills/subagent-driven-development/SKILL.md"],
        check=True, capture_output=True, text=True,
    ).stdout
    return text[:20000].count("\n") + 1, text.count("\n") + (0 if text.endswith("\n") else 1)


def invoked_name(skill: str) -> str:
    """The bare skill name a Skill call loaded (``hyperpowers:brainstorming`` -> ``brainstorming``)."""
    return skill.split(":", 1)[-1]


def noskill_reading(found: list[dict[str, Any]]) -> dict[str, Any]:
    """Validity and failure for one sentinel trial.

    Valid when an automatic compaction lands before the last reply and no
    skill was invoked before the first compaction. A valid trial fails when,
    after the first compaction, it reads the ``SKILL.md`` of a skill it never
    invoked, by any reader, credited or not; ``using-hyperpowers`` is exempt
    because the bootstrap injects it.

    :param found: The run's events.
    :returns: ``valid``, ``failed`` and ``reads`` (the offending paths).
    """
    first = next((i for i, e in enumerate(found) if e["kind"] == "compact"), None)
    last_reply = max((i for i, e in enumerate(found) if e["kind"] == "reply"), default=None)
    if first is None or last_reply is None or first > last_reply:
        return {"valid": False, "failed": None, "reads": []}
    if any(e["kind"] == "skill" for e in found[:first]):
        return {"valid": False, "failed": None, "reads": []}
    invoked = {invoked_name(e["skill"]) for e in found if e["kind"] == "skill"}
    bad = []
    for event in found[first + 1:]:
        if event["kind"] != "read":
            continue
        match = SKILL_PATH.search(event["path"])
        if match and match.group(1) not in invoked and match.group(1) != "using-hyperpowers":
            bad.append(event["path"])
    return {"valid": True, "failed": bool(bad), "reads": bad}


def pooled_rate(runs: list[dict[str, Any]]) -> float:
    """Re-reads over compactions, pooled across valid runs."""
    valid = [r for r in runs if r["valid"]]
    total = sum(r["compactions"] for r in valid)
    return sum(r["followed"] for r in valid) / total if total else 0.0


def median_compactions(runs: list[dict[str, Any]]) -> float:
    """Median compactions per valid run."""
    values = sorted(r["compactions"] for r in runs if r["valid"])
    if not values:
        return 0.0
    mid = len(values) // 2
    return values[mid] if len(values) % 2 else (values[mid - 1] + values[mid]) / 2


def load_reruns(path: Path, runs: dict[str, dict[str, Any]]) -> dict[str, str]:
    """Read ``sentinel-reruns.tsv`` (original, replacement) and enforce the replacement rules.

    A replacement that is itself void may be replaced in turn by a later row
    naming it as the original (``original -> r1``, ``r1 -> r2``); every link
    counts toward the cell's cap of three.

    :raises ValueError: On a row without exactly two non-empty fields, an
        unknown run, an original replaced twice, a
        non-void original, a cross-cell replacement, a replacement used twice,
        more than three per arm and scenario, or an ``r<n>`` run no row lists.
    """
    pairs: dict[str, str] = {}
    used: set[str] = set()
    per_cell: Counter[tuple[str, str]] = Counter()
    if path.is_file():
        with path.open(encoding="utf-8") as handle:
            for n, row in enumerate(csv.reader(handle, delimiter="\t"), start=1):
                if not row or row[0].startswith("#"):
                    continue
                if len(row) != 2 or not all(row):
                    raise ValueError(f"sentinel-reruns.tsv line {n}: expected two non-empty tab-separated run ids")
                original, replacement = row[0], row[1]
                if original not in runs or replacement not in runs:
                    raise ValueError(f"unknown run in sentinel-reruns.tsv: {original} {replacement}")
                o, r = runs[original], runs[replacement]
                if original in pairs:
                    raise ValueError(f"{original} is replaced more than once")
                if not o["void"]:
                    raise ValueError(f"{original} is not a void")
                if (o["arm"], o["scenario"]) != (r["arm"], r["scenario"]):
                    raise ValueError(f"{replacement} is not in {original}'s arm and scenario")
                if replacement in used:
                    raise ValueError(f"{replacement} replaces more than one run")
                used.add(replacement)
                per_cell[(o["arm"], o["scenario"])] += 1
                if per_cell[(o["arm"], o["scenario"])] > 3:
                    raise ValueError(f"more than three replacements in {o['arm']} {o['scenario']}")
                pairs[original] = replacement
    for run_id, run in runs.items():
        if run["proc"].startswith("r") and run_id not in used:
            raise ValueError(f"replacement run {run_id} has no sentinel-reruns.tsv row")
    return pairs

RUN_ID = re.compile(r"^run-id: (\S+)$", re.MULTILINE)
SCENARIOS = (SDD, NOSKILL)
LOG_NAME = re.compile(r"^(control|treatment|shipped)-(" + "|".join(SCENARIOS) + r")-(p(?:[1-9]|10)|r[1-3])$")
EXPECTED_VALID = 10


def void_kind(verdict: dict[str, Any]) -> str | None:
    """Name a void read from the verdict (adapted from the companion tally).

    :param verdict: A parsed ``verdict.json``.
    :returns: ``setup``, ``grader`` (the Gauntlet-Agent gave no pass/fail
        judgement: ``investigate``, ``errored`` or anything else), ``instrument``
        (a quorum stage after setup errored, e.g. the post-checks were cut
        short), or None for a real attempt.
    """
    error = verdict.get("error") or {}
    stage = error.get("stage") if isinstance(error, dict) else None
    if stage == "setup":
        return "setup"
    if error:
        return "instrument"
    if verdict.get("final") in ("pass", "fail"):
        return None
    gauntlet = verdict.get("gauntlet") or {}
    if gauntlet and gauntlet.get("status") not in ("pass", "fail"):
        return "grader"
    if not gauntlet and "quorum error (setup)" in str(verdict.get("final_reason") or ""):
        return "setup"
    return "instrument"


def post_check(verdict: dict[str, Any], name: str) -> bool | None:
    """Read one post-phase check record, or None when it is absent."""
    for record in verdict.get("checks") or []:
        if record.get("phase") == "post" and record.get("check") == name:
            return bool(record.get("passed"))
    return None


def post_checks_pass(verdict: dict[str, Any]) -> bool:
    """Whether every post-phase check passed; no post record at all is not a pass."""
    records = [r for r in verdict.get("checks") or [] if r.get("phase") == "post"]
    return bool(records) and all(r.get("passed") for r in records)


def final_reading(verdict: dict[str, Any]) -> str:
    """Read a run by its composed final verdict: ``pass``, ``fail`` or ``indeterminate``."""
    final = verdict.get("final")
    return str(final) if final in ("pass", "fail") else "indeterminate"


def placeholder(arm: str, scenario: str, proc: str, kind: str) -> dict[str, Any]:
    """A void row for a log or run that left no usable record."""
    return {
        "run": f"{kind}:{arm}-{scenario}-{proc}", "arm": arm, "scenario": scenario, "proc": proc,
        "void": True, "void_kind": kind, "valid": False, "outcome": None, "mechanism": None,
    }


def read_run(arm: str, scenario: str, proc: str, run_id: str, launch_ok: bool = True) -> dict[str, Any]:
    """Read one run and print its line.

    :param arm: ``control``, ``treatment`` or ``shipped``.
    :param scenario: One of the two campaign scenarios.
    :param proc: The row's proc id.
    :param run_id: The quorum run id.
    :param launch_ok: False when the launcher log did not end ``DONE``.
    :returns: The run's row; void with kind ``no-record`` when it has no verdict.
    """
    try:
        record, transcripts = run_paths(arm, run_id)
    except FileNotFoundError:
        run = placeholder(arm, scenario, proc, "no-record")
        run["run"] = run_id
        print_run(run)
        return run
    verdict = json.loads((record / "verdict.json").read_text(encoding="utf-8"))
    found = events(transcripts)
    kind = "launch" if not launch_ok else void_kind(verdict)
    outcome: bool | None = None
    mechanism: bool | None = None
    if scenario == SDD:
        cut = arm_cut(arm)
        timing = sdd_reading(found, cut)
        if kind is None and not timing["valid"]:
            kind = "instrument"
        valid = kind is None
        if valid:
            outcome = bool(timing["outcome"]) and post_checks_pass(verdict)
            mechanism = bool(timing["mechanism"])
        extra: dict[str, Any] = compaction_follow(found, cut)
    else:
        # The sentinel is read from the transcript alone; the Gauntlet verdict
        # matters only through void_kind, so its outcome bars are skipped.
        timing = noskill_reading(found)
        if kind is None and not timing["valid"]:
            kind = "instrument"
        valid = kind is None
        extra = {"failed": bool(timing["failed"]) if valid else None, "reads": timing["reads"]}
    run = {
        "run": run_id, "arm": arm, "scenario": scenario, "proc": proc, "void": kind is not None,
        "void_kind": kind, "valid": valid, "outcome": outcome, "mechanism": mechanism,
        "final": final_reading(verdict),
        "classes": dispatch_counts(found),
        "truncation_unparsed": sum(1 for e in found if e["kind"] == "note" and e["note"] == "truncation_unparsed"),
        "truncation_unmatched": sum(1 for e in found if e["kind"] == "note" and e["note"] == "truncation_unmatched"),
        **extra,
    }
    print_run(run)
    return run


def dispatch_counts(found: list[dict[str, Any]]) -> dict[str, int]:
    """Count the main-thread Agent dispatches by class."""
    counts = {kind: 0 for kind in ("implement", "review", "rereview", "fix", "final", "other")}
    for event in found:
        if event["kind"] == "dispatch":
            counts[event["class"]] += 1
    return counts


def print_run(run: dict[str, Any]) -> None:
    line = (
        f"{run['arm']}\t{run['scenario']}\t{run['proc']}\t{run['run']}"
        f"\tvoid={run['void_kind'] or '-'}\toutcome={run['outcome']}\tmechanism={run['mechanism']}"
    )
    if "classes" in run:
        line += "\tdispatches=" + ",".join(f"{k}:{v}" for k, v in run["classes"].items())
    if "compactions" in run:
        line += f"\tcompactions={run['compactions']} followed={run['followed']} whole={run['whole']}"
    if "failed" in run:
        line += f"\tfailed={run['failed']} reads={','.join(run['reads']) or '-'}"
    for note in ("truncation_unparsed", "truncation_unmatched"):
        if run.get(note):
            line += f"\t{note}={run[note]}"
    print(line)


def collect(logs: Path) -> dict[str, dict[str, Any]]:
    """Read every campaign log's runs, keyed by run id.

    A log that does not end ``DONE`` yields only void ``launch`` runs; a log
    naming no run id yields a placeholder keyed by the log's name.

    :param logs: The log directory.
    :returns: The runs keyed by run id.
    """
    runs: dict[str, dict[str, Any]] = {}
    for log in sorted(logs.glob("*.log")):
        match = LOG_NAME.match(log.stem)
        if not match:
            if log.stem.startswith(("control-", "treatment-", "shipped-")):
                print(f"skipped log with an unrecognized name (not counted): {log.name}")
            continue
        arm, scenario, proc = match.groups()
        text = log.read_text(encoding="utf-8")
        lines = [line for line in text.splitlines() if line.strip()]
        done = bool(lines) and lines[-1].startswith("DONE ")
        ids = RUN_ID.findall(text)
        if len(ids) != 1:
            # Zero ids is a launch failure; several would inflate the cell, so
            # the row is reported as one void and none of its runs counts.
            kind = "launch" if not ids else "multi-run"
            run = placeholder(arm, scenario, proc, kind)
            run["run"] = f"{kind}:{log.stem}"
            print_run(run)
            runs[run["run"]] = run
            continue
        for run_id in ids:
            runs[run_id] = read_run(arm, scenario, proc, run_id, launch_ok=done)
    return runs


def rate(passes: int, valid: int) -> float:
    return passes / valid if valid else 0.0


def bar(ok: bool | None) -> str:
    return "incomplete" if ok is None else "PASS" if ok else "FAIL"


CELLS = (("control", SDD), ("treatment", SDD), ("shipped", SDD), ("treatment", NOSKILL))


def summarize(runs: dict[str, dict[str, Any]], replaced: set[str]) -> None:
    """Print each cell's counts and the spec's pass-bar reading."""

    def valid_in(arm: str, scenario: str) -> list[dict[str, Any]]:
        return [
            r for r in runs.values()
            if (r["arm"], r["scenario"]) == (arm, scenario) and r["valid"] and r["run"] not in replaced
        ]

    present = {(r["arm"], r["scenario"]) for r in runs.values()}
    for arm, scenario in [*CELLS, *sorted(present - set(CELLS))]:
        mine = [r for r in runs.values() if (r["arm"], r["scenario"]) == (arm, scenario)]
        valid = valid_in(arm, scenario)
        voids = Counter(r["void_kind"] for r in mine if r["void"])
        line = f"{arm} {scenario}: runs={len(mine)} valid={len(valid)} voids={dict(voids) or '-'}"
        if scenario == SDD:
            line += (
                f" outcome={sum(1 for r in valid if r['outcome'])}"
                f" mechanism={sum(1 for r in valid if r['mechanism'])}"
            )
        else:
            line += f" failed={sum(1 for r in valid if r['failed'])}"
        if (arm, scenario) not in CELLS:
            line += " (outside the campaign's cells, not counted)"
        print(line)

    control, treatment, shipped = valid_in("control", SDD), valid_in("treatment", SDD), valid_in("shipped", SDD)
    sentinel = valid_in("treatment", NOSKILL)

    def complete(*cells: list[dict[str, Any]]) -> bool:
        return all(len(cell) >= EXPECTED_VALID for cell in cells)

    def count(cell: list[dict[str, Any]], key: str) -> int:
        return sum(1 for r in cell if r[key])

    print("SDD treatment mechanism (>= 8):",
          bar(None if not complete(treatment) else count(treatment, "mechanism") >= 8))
    print("SDD treatment per-compaction (>= 85%):",
          bar(None if not complete(treatment) else pooled_rate(treatment) >= 0.85))
    print("SDD treatment outcome (>= control):",
          bar(None if not complete(treatment, control)
              else rate(count(treatment, "outcome"), len(treatment)) >= rate(count(control, "outcome"), len(control))))
    # More than three control mechanisms is already a stop before the cell
    # fills: valid runs only accumulate, so the count cannot fall back.
    control_mechanism = count(control, "mechanism")
    print("SDD control mechanism stop (> 3):",
          "STOP" if control_mechanism > 3 else "incomplete" if not complete(control) else "ok")
    print("shipped outcome (>= 9):", bar(None if not complete(shipped) else count(shipped, "outcome") >= 9))
    print("shipped per-compaction (>= 90%):", bar(None if not complete(shipped) else pooled_rate(shipped) >= 0.90))
    print("shipped median compactions (<= 16):",
          bar(None if not complete(shipped) else median_compactions(shipped) <= 16))
    print("sentinel failures (<= 1):", bar(None if not complete(sentinel) else count(sentinel, "failed") <= 1))
    print_compaction_summary(runs, replaced)


def print_compaction_summary(runs: dict[str, dict[str, Any]], replaced: set[str]) -> None:
    """Print each SDD arm's pooled per-compaction totals and whole-file counts."""
    for arm in ("control", "treatment", "shipped"):
        valid = [
            r for r in runs.values()
            if (r["arm"], r["scenario"]) == (arm, SDD) and r["valid"] and r["run"] not in replaced
        ]
        total = sum(r["compactions"] for r in valid)
        followed = sum(r["followed"] for r in valid)
        every = sum(1 for r in valid if r["compactions"] and r["followed"] == r["compactions"])
        print(
            f"{arm} {SDD} per-compaction: compactions={total} followed={followed} ({100 * pooled_rate(valid):.0f}%) "
            f"whole={sum(r['whole'] for r in valid)} runs-every-followed={every}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--run", help="read one run by id (smoke)")
    # The arm picks the pinned SKILL.md whose cut an SDD run is read against,
    # so a smoke is read as one of the three arms.
    parser.add_argument("--arm", default="control", choices=("control", "treatment", "shipped"), help="arm of --run")
    parser.add_argument("--scenario", choices=SCENARIOS, help="scenario of --run")
    args = parser.parse_args()
    if args.run:
        if not args.scenario:
            parser.error("--run needs --scenario")
        read_run(args.arm, args.scenario, "p90", args.run)
        return 0
    runs = collect(HERE / "logs")
    try:
        pairs = load_reruns(HERE / "sentinel-reruns.tsv", runs)
    except ValueError as error:
        print(f"sentinel-reruns.tsv: {error}")
        return 1
    summarize(runs, set(pairs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
