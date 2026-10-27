"""Turn ends, background tasks and the stop test shared by both analyzers.

``analyze.py`` (one run of the ``sdd-turn-liveness`` scenario) and
``field.py`` (Claude Code transcripts on this host) read transcripts through
this module, so a premature stop, a live task and a censored task mean one
thing in both (spec Design §2 and §3; plan deviations 2 and 3).

A transcript here is the main session's records in file order; subagent
(sidechain) records are dropped on load. A turn end is found structurally,
because the interactive transcripts quorum records do not mark it: every
main-session assistant record there carries ``stop_reason: tool_use``. The
session was idle when the next main-session user record is a human message
or a completion notice delivered as its own message, or when the transcript
ends.
"""

from __future__ import annotations

import json
import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Literal

Record = dict[str, Any]
State = Literal["live", "censored", "none"]
Kind = Literal["agent", "bash"]
EndedBy = Literal["human", "notification", "eof"]
Excluded = Literal["reload", "interrupt", "error", "killed"]

NOTIF_ID = re.compile(r"<tool-use-id>([^<]+)</tool-use-id>")
TASK_NOTICE = "<task-notification>"
LAUNCH_AGENT = "Async agent launched"
LAUNCH_BASH = "Command running in background with ID"
RELOAD_TOOL_RESULT = "the session ended before this call's result was recorded"
RELOAD_PREFIX = "[Tool call interrupted:"
LAUNCH_BASH_AUTO = "Command did not complete within its"
AUTO_MOVED = "was moved to the background"
AGENT_TOOLS = frozenset({"Agent", "Task"})
# The Stop hook's own vocabulary for the two tracked kinds, which the refusal
# messages and the decision lines use.
KIND_NAMES: Mapping[Kind, str] = {"agent": "agent", "bash": "shell"}
SEND_OK = '{"success":true,"message":"'
RESUMED = ("Resuming agent ", "in the background with your message")
ASK_TOOL = "AskUserQuestion"
ASK_ANSWERED = "Your questions have been answered"
RELOAD_REPLY = "No response requested."
INTERRUPTED = "[Request interrupted"
ERROR_PREFIXES = ("API Error", "Request timed out")
RESUME_WORDS = frozenset({"resume", "proceed", "continue", "go on", "keep going"})
APPROVAL = re.compile(
    r"\b(?:say (?:the word|[\"']?(?:continue|proceed|go|resume)[\"']?)"
    r"|let me know|your call|which (?:option|one|do you)|do you want"
    r"|would you like|shall i|should i|want me to|approve"
    r"|for your review|for you to review|when(?:ever)? you(?:'re| are) ready"
    r"|your go-ahead|decision is yours|is yours to make)\b",
    re.IGNORECASE,
)
SENTENCE_END = re.compile(r"(?<=[.!?])\s+")
SLIM_RESULT = 300
SLIM_INPUT = 20000


def parse_ts(value: str) -> datetime:
    """Parse a transcript timestamp (``...Z`` or an offset) to an aware datetime."""
    return datetime.fromisoformat(value)


def _slim(rec: Record) -> Record:
    """Drop the bulk a field scan never reads, keeping every marker it does."""
    for block in blocks(rec):
        if block.get("type") == "tool_result":
            block["content"] = result_text(block)[:SLIM_RESULT]
        elif block.get("type") == "tool_use" and isinstance(block.get("input"), dict):
            block["input"] = {
                k: (v[:SLIM_INPUT] if isinstance(v, str) else v) for k, v in block["input"].items()
            }
    if rec.get("type") == "attachment":
        payload = rec.get("attachment") or {}
        if payload.get("type") != "deferred_tools_delta":
            rec["attachment"] = {"type": payload.get("type")}
    return rec


def load(path: Path, slim: bool = False) -> list[Record]:
    """Read a transcript's main-session records that carry a timestamp.

    :param path: A Claude Code session transcript (JSONL).
    :param slim: Truncate tool results, tool inputs and attachments, for the
        multi-gigabyte field transcripts.
    :returns: The records in file order.
    """
    records: list[Record] = []
    with path.open("rb") as fh:
        for line in fh:
            try:
                rec = json.loads(line)
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue
            if not isinstance(rec, dict) or rec.get("isSidechain"):
                continue
            if not isinstance(rec.get("timestamp"), str):
                continue
            records.append(_slim(rec) if slim else rec)
    return records


def blocks(rec: Record) -> list[dict[str, Any]]:
    content = (rec.get("message") or {}).get("content")
    if isinstance(content, list):
        return [b for b in content if isinstance(b, dict)]
    return []


def text_of(rec: Record) -> str:
    content = (rec.get("message") or {}).get("content")
    if isinstance(content, str):
        return content
    return "\n".join(str(b.get("text", "")) for b in blocks(rec) if b.get("type") == "text")


def result_text(block: Mapping[str, Any]) -> str:
    content = block.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(str(c.get("text", "")) for c in content if isinstance(c, dict))
    return ""


def is_tool_result(rec: Record) -> bool:
    return rec.get("type") == "user" and any(b.get("type") == "tool_result" for b in blocks(rec))


def tool_uses(rec: Record) -> list[dict[str, Any]]:
    if rec.get("type") != "assistant":
        return []
    return [b for b in blocks(rec) if b.get("type") == "tool_use"]


def tool_input(use: Mapping[str, Any]) -> dict[str, Any]:
    """A tool_use block's input, or an empty dict when it is missing or malformed."""
    inp = use.get("input")
    return inp if isinstance(inp, dict) else {}


def idle_marker(rec: Record) -> Literal["human", "notification"] | None:
    """Say whether a main-session user record shows the session was idle.

    :returns: ``human`` for a typed message, ``notification`` for a completion
        notice delivered as its own message, None for anything else (tool
        results, meta records, compaction summaries, local-command echoes,
        interrupts).
    """
    if rec.get("type") != "user" or rec.get("isMeta") or is_tool_result(rec):
        return None
    # A compaction summary is a user-type record without isMeta; it marks a
    # context reset inside a turn, not a message from the human partner.
    if rec.get("isCompactSummary") or rec.get("isVisibleInTranscriptOnly"):
        return None
    text = text_of(rec).lstrip()
    if text.startswith(TASK_NOTICE):
        return "notification"
    if not text or text.startswith(INTERRUPTED):
        return None
    # Typed slash commands and IDE context start with markup but are the human
    # partner's own messages, which Claude Code marks human-origin; markup
    # records without that origin are local-command and system envelopes.
    if (rec.get("origin") or {}).get("kind") == "human":
        return "human"
    if text.startswith("<"):
        return None
    return "human"


@dataclass(frozen=True)
class Task:
    """A background task the harness tracks: a launch and its completion, if recorded."""

    tool_use_id: str
    kind: Kind
    launched: datetime
    completed: datetime | None


@dataclass(frozen=True)
class TurnEnd:
    """One point where the main session stopped and waited."""

    at: datetime
    text: str
    ended_by: EndedBy
    next_human: str | None
    excluded: Excluded | None


def _completion_ids(rec: Record) -> list[str]:
    if rec.get("type") == "queue-operation" and rec.get("operation") == "enqueue":
        content = rec.get("content")
        return NOTIF_ID.findall(content) if isinstance(content, str) else []
    if rec.get("type") == "user":
        text = text_of(rec)
        if text.lstrip().startswith(TASK_NOTICE):
            return NOTIF_ID.findall(text)
    return []


def _launch_kind(name: str | None, background: bool, text: str) -> Kind | None:
    """The tracked launch a tool result records, or None.

    A marker counts only at the start of a result from its own tool, and a
    shell launch also needs ``run_in_background: true`` on the call: a
    foreground command that prints or greps the marker text launches nothing.
    A Bash call that Claude Code moved to the background after its timeout is
    a tracked launch too (plan deviation 7), and so is an agent that
    ``SendMessage`` resumed in the background (plan deviation 8). The resume
    markers sit in the result's message, inside the first 300 characters a
    slim load keeps.
    """
    head = text.lstrip()
    if name in AGENT_TOOLS and head.startswith(LAUNCH_AGENT):
        return "agent"
    if name == "Bash" and background and head.startswith(LAUNCH_BASH):
        return "bash"
    if name == "Bash" and head.startswith(LAUNCH_BASH_AUTO) and AUTO_MOVED in head:
        return "bash"
    if name == "SendMessage" and head.startswith(SEND_OK) and any(m in head for m in RESUMED):
        return "agent"
    return None


def _is_reload_result(block: Mapping[str, Any]) -> bool:
    """A tool result the harness wrote when the session ended mid-call (flagged as an error)."""
    head = result_text(block).lstrip()
    return block.get("is_error") is True and head.startswith(RELOAD_PREFIX) and RELOAD_TOOL_RESULT in head


def _questions(inp: Mapping[str, Any]) -> list[str]:
    asked = inp.get("questions")
    if not isinstance(asked, list):
        return []
    return [str(q["question"]).strip() for q in asked if isinstance(q, dict) and q.get("question")]


def tasks(records: Sequence[Record]) -> dict[str, Task]:
    """Find every tracked background launch and its first recorded completion."""
    calls: dict[str, tuple[str, bool]] = {}
    launched: dict[str, tuple[Kind, datetime]] = {}
    done: dict[str, datetime] = {}
    for rec in records:
        when = parse_ts(rec["timestamp"])
        for use in tool_uses(rec):
            if isinstance(use.get("id"), str):
                calls[use["id"]] = (str(use.get("name")), tool_input(use).get("run_in_background") is True)
        if rec.get("type") == "user":
            for block in blocks(rec):
                if block.get("type") != "tool_result":
                    continue
                tool_id = block.get("tool_use_id")
                if not isinstance(tool_id, str) or tool_id in launched:
                    continue
                name, background = calls.get(tool_id, ("", False))
                kind = _launch_kind(name, background, result_text(block))
                if kind is not None:
                    launched[tool_id] = (kind, when)
        for tool_id in _completion_ids(rec):
            done.setdefault(tool_id, when)
    out: dict[str, Task] = {}
    for tool_id, (kind, start) in launched.items():
        end = done.get(tool_id)
        out[tool_id] = Task(tool_id, kind, start, end if end is not None and end >= start else None)
    return out


def reloads(records: Sequence[Record]) -> list[datetime]:
    """Times the session process ended and was reloaded."""
    out: list[datetime] = []
    for rec in records:
        lost_result = rec.get("type") == "user" and any(
            b.get("type") == "tool_result" and _is_reload_result(b) for b in blocks(rec)
        )
        reload_reply = rec.get("type") == "assistant" and text_of(rec).strip() == RELOAD_REPLY
        if lost_result or reload_reply:
            out.append(parse_ts(rec["timestamp"]))
    return out


def turn_ends(records: Sequence[Record]) -> list[TurnEnd]:
    """Find every turn end (plan deviation 2) with its closing text.

    The closing text is the assistant text after the turn's last tool
    result, followed by the questions of any AskUserQuestion call the turn
    left unanswered (a dismissed question, answered by a typed message). The
    turn end's time is the turn's last assistant record or tool result, so a
    stop right after a background launch is judged after the launch. A turn
    end is excluded, not judged, when the turn held a reload
    (``reload``), an interrupt (``interrupt``), an API error message
    (``error``), or ended the transcript before the assistant answered its
    last tool call or tool result (``killed``).
    """
    out: list[TurnEnd] = []
    last_at: datetime | None = None
    final: list[str] = []
    asked: dict[str, list[str]] = {}
    excluded: Excluded | None = None
    pending = False
    for rec in records:
        if rec.get("type") == "assistant":
            last_at = parse_ts(rec["timestamp"])
            stripped = text_of(rec).strip()
            if stripped == RELOAD_REPLY:
                excluded = "reload"
            elif rec.get("isApiErrorMessage") or stripped.startswith(ERROR_PREFIXES):
                excluded = excluded or "error"
            if stripped:
                final.append(stripped)
            for use in tool_uses(rec):
                if use.get("name") == ASK_TOOL and isinstance(use.get("id"), str):
                    asked[use["id"]] = _questions(tool_input(use))
            pending = bool(tool_uses(rec))
            continue
        if is_tool_result(rec):
            last_at = parse_ts(rec["timestamp"])
            results = [b for b in blocks(rec) if b.get("type") == "tool_result"]
            for block in results:
                if block.get("tool_use_id") in asked and result_text(block).lstrip().startswith(ASK_ANSWERED):
                    asked.pop(str(block["tool_use_id"]))
            texts = [result_text(b) for b in results]
            if any(_is_reload_result(b) for b in results):
                excluded = "reload"
            elif any(t.lstrip().startswith(INTERRUPTED) for t in texts):
                excluded = excluded or "interrupt"
            final = []
            # The assistant's answer to this result is still owed; a transcript
            # that ends here ended mid-turn.
            pending = True
            continue
        if rec.get("type") == "user" and text_of(rec).lstrip().startswith(INTERRUPTED):
            excluded = excluded or "interrupt"
            pending = False
            continue
        marker = idle_marker(rec)
        if marker is None:
            continue
        if last_at is not None:
            nxt = text_of(rec).strip() if marker == "human" else None
            text = "\n".join(final + [q for qs in asked.values() for q in qs])
            out.append(TurnEnd(last_at, text, marker, nxt, excluded))
        last_at, final, asked, excluded, pending = None, [], {}, None, False
    if last_at is not None:
        text = "\n".join(final + [q for qs in asked.values() for q in qs])
        out.append(TurnEnd(last_at, text, "eof", None, excluded or ("killed" if pending else None)))
    return out


def state_at(at: datetime, task_map: Mapping[str, Task], reload_times: Sequence[datetime]) -> State:
    """Classify the background work at ``at`` (spec Design §2 live, §3 censored).

    ``censored``: a task launched at or before ``at`` never records a
    completion and no reload ended it before ``at``. It wins over a live
    task: the censored task's liveness is unknown, so the moment counts in
    neither the premature nor the live-work tally (spec Design §3, plan
    deviation 3). ``live``: otherwise, a task launched at or before ``at``
    records its completion after it. ``none``: neither.
    """
    live = censored = False
    for task in task_map.values():
        if task.launched > at:
            continue
        if task.completed is not None:
            live = live or task.completed > at
        elif not any(task.launched < r <= at for r in reload_times):
            censored = True
    return "censored" if censored else "live" if live else "none"


def live_kinds_at(
    at: datetime, task_map: Mapping[str, Task], reload_times: Sequence[datetime]
) -> set[str]:
    """The kinds of the tracked tasks that were still running at ``at``.

    A task launched at or before ``at`` was running then unless it recorded a
    completion by then, or a reload between its launch and ``at`` ended the
    session that owned it — the same reload rule ``state_at`` applies, without
    which a task the session never saw again reads as live for the rest of the
    transcript. The names are the Stop hook's, not the transcript's: a
    background Bash call is a ``shell`` there, which is what the live-shell
    refusal is about.
    """
    kinds: set[str] = set()
    for task in task_map.values():
        if task.launched > at:
            continue
        if task.completed is not None:
            if task.completed > at:
                kinds.add(KIND_NAMES[task.kind])
        elif not any(task.launched < r <= at for r in reload_times):
            kinds.add(KIND_NAMES[task.kind])
    return kinds


def asks_or_blocks(text: str) -> bool:
    """The field's question and BLOCKED test (spec Design §3), a heuristic.

    True when the text reports ``BLOCKED``, its last sentence ends in a
    question mark, or its last three sentences ask for approval or a
    decision. ``test_liveness.Heuristic.CASES`` is the hand-labelled sample.
    """
    if "BLOCKED" in text:
        return True
    stripped = text.strip()
    if not stripped:
        return False
    sentences = SENTENCE_END.split(stripped)
    if sentences[-1].rstrip(" *_`)\"'").endswith("?"):
        return True
    return APPROVAL.search(" ".join(sentences[-3:])) is not None


def is_resume(text: str | None) -> bool:
    """True for a message that is only "Resume", "Proceed", "continue", "go on" or "keep going"."""
    if text is None:
        return False
    return text.strip().rstrip(".!").strip().lower() in RESUME_WORDS
