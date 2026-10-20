"""Synthetic transcript records for the analyzer tests.

Every string here is invented for the tests; nothing comes from a real
session. Timestamps are seconds after a fixed base so a test reads as a
timeline.
"""

from __future__ import annotations

import json
from collections.abc import Iterable, Sequence
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

BASE = datetime(2026, 10, 20, 10, 0, 0, tzinfo=UTC)
AGENT_BG = "Async agent launched successfully. agentId: a-test (internal metadata)"
BASH_BG = "Command running in background with ID: b-test. Output is being written to: /tmp/b-test.output"
RELOAD_RESULT = (
    "[Tool call interrupted: the session ended before this call's result was recorded, "
    "so its output is lost]"
)

Record = dict[str, Any]


def at(seconds: float) -> str:
    """Return the ISO timestamp ``seconds`` after the base, in transcript form."""
    return (BASE + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def assistant(
    t: float,
    text: str = "",
    tools: Sequence[tuple[str, str, dict[str, Any]]] = (),
    version: str = "2.1.300",
) -> Record:
    content: list[dict[str, Any]] = []
    if text:
        content.append({"type": "text", "text": text})
    for tool_id, name, inp in tools:
        content.append({"type": "tool_use", "id": tool_id, "name": name, "input": inp})
    return {
        "type": "assistant",
        "timestamp": at(t),
        "isSidechain": False,
        "version": version,
        "message": {"role": "assistant", "model": "claude-opus-5-5", "content": content},
    }


def result(t: float, tool_id: str, text: str, is_error: bool = False) -> Record:
    block: dict[str, Any] = {"type": "tool_result", "tool_use_id": tool_id, "content": [{"type": "text", "text": text}]}
    if is_error:
        block["is_error"] = True
    return {"type": "user", "timestamp": at(t), "isSidechain": False, "message": {"role": "user", "content": [block]}}


def human(t: float, text: str, **extra: Any) -> Record:
    rec: Record = {
        "type": "user",
        "timestamp": at(t),
        "isSidechain": False,
        "origin": {"kind": "human"},
        "message": {"role": "user", "content": text},
    }
    rec.update(extra)
    return rec


def _notice(tool_id: str) -> str:
    return (
        "<task-notification>\n<task-id>x</task-id>\n"
        f"<tool-use-id>{tool_id}</tool-use-id>\n<status>completed</status>\n</task-notification>"
    )


def notification(t: float, tool_id: str) -> Record:
    return {
        "type": "user",
        "timestamp": at(t),
        "isSidechain": False,
        "origin": {"kind": "task-notification"},
        "message": {"role": "user", "content": _notice(tool_id)},
    }


def enqueue(t: float, tool_id: str) -> Record:
    return {"type": "queue-operation", "operation": "enqueue", "timestamp": at(t), "content": _notice(tool_id)}


def attachment(t: float, payload: dict[str, Any]) -> Record:
    return {"type": "attachment", "timestamp": at(t), "isSidechain": False, "attachment": payload}


def sidechain(rec: Record) -> Record:
    out = dict(rec)
    out["isSidechain"] = True
    return out


def write(path: Path, records: Iterable[Record]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in records))
    return path
