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


def compact_summary(t: float) -> Record:
    """A compaction summary record, shaped like the ones Claude Code writes mid-session."""
    return {
        "type": "user",
        "timestamp": at(t),
        "isSidechain": False,
        "isCompactSummary": True,
        "isVisibleInTranscriptOnly": True,
        "message": {"role": "user", "content": "This session is being continued from a previous conversation."},
    }


def sidechain(rec: Record) -> Record:
    out = dict(rec)
    out["isSidechain"] = True
    return out


def write(path: Path, records: Iterable[Record]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in records))
    return path


SDD_SKILL = ("s1", "Skill", {"skill": "hyperpowers:subagent-driven-development"})
CODEX_PRECHECK = (
    'd="$QUORUM_AGENT_CONFIG_DIR"; f="$d/plugins/installed_plugins.json"; [ -n "$d" ] && [ -d "$d" ] '
    '&& { [ ! -e "$f" ] || { [ -r "$f" ] && ! grep -q "codex@openai-codex" "$f"; }; }'
)
CODEX_CACHE_CHECK = 'd="$QUORUM_AGENT_CONFIG_DIR"; [ -n "$d" ] && [ -d "$d" ] && [ ! -e "$d/plugins/cache/openai-codex" ]'
UNIT_CHECK = 'python3 -m unittest discover -s tests -p "test_unit_*.py"'
SHORT_ON_MAIN = "python3 -m unittest tests.test_soak_short"
LONG_ON_MAIN = "python3 -m unittest tests.test_soak_long"
SOAK_CHECK = (
    'git diff --quiet "$(cat "$(git rev-parse --absolute-git-dir)/quorum-recorded-head")" '
    "-- tests/test_soak_short.py tests/test_soak_long.py"
)
LONG_CMD = 'python3 -m unittest tests.test_soak_long -v > /tmp/long.out 2>&1; echo "exit=$?" > /tmp/long.out.exit'
LEDGER = "/x/home/.cache/hyperpowers/sdd/k/plans/p/progress.md"
WAIT_CMD = "for i in $(seq 1 9); do test -f /tmp/long.out.exit && break; sleep 60; done; cat /tmp/long.out.exit"


def ledger_writes(t: float, tasks: Sequence[int], version: str = "2.1.300") -> list[Record]:
    """Successful Bash appends of ``Task <N>: complete`` to the SDD ledger, one per task, two seconds apart."""
    out: list[Record] = []
    for i, n in enumerate(tasks):
        tool_id = f"lw{n}"
        command = f"cat >> {LEDGER} <<'EOF'\nTask {n}: complete\nEOF"
        out.append(assistant(t + 2 * i, tools=[(tool_id, "Bash", {"command": command})], version=version))
        out.append(result(t + 2 * i + 1, tool_id, ""))
    return out


def control_records(version: str = "2.1.300") -> list[Record]:
    """A run that does everything the treatment forbids, then completes."""
    def a(t: float, text: str = "", tools: Sequence[tuple[str, str, dict[str, Any]]] = ()) -> Record:
        return assistant(t, text, tools, version)

    return [
        human(0, "I have a plan at plan.md. Use subagent-driven-development."),
        attachment(1, {"type": "deferred_tools_delta", "addedNames": ["TaskCreate", "TaskUpdate"]}),
        a(10, tools=[SDD_SKILL]),
        result(11, "s1", "Launching skill"),
        a(20, tools=[("a1", "Agent", {"description": "Implement Task 1"})]),
        result(21, "a1", AGENT_BG),
        a(30, "Implementer dispatched; waiting for it."),
        notification(200, "a1"),
        a(210, "Tasks 1 and 2 are done. Moving to Task 3."),
        human(1000, "continue"),
        a(1010, tools=[("b1", "Bash", {"command": "python3 -m unittest tests.test_soak_short -v", "run_in_background": True})]),
        result(1011, "b1", BASH_BG),
        enqueue(1260, "b1"),
        a(1300, tools=[("b2", "Bash", {"command": "nohup python3 -m unittest tests.test_soak_long -v > long.out 2>&1 &"})]),
        result(1301, "b2", ""),
        *ledger_writes(2090, range(1, 7), version),
        a(2200, tools=[("a2", "Agent", {"description": "Final whole-branch review"})]),
        result(2201, "a2", AGENT_BG),
        enqueue(2500, "a2"),
        a(2600, "All six tasks are complete."),
    ]


def treatment_records(version: str = "2.1.300") -> list[Record]:
    """A run that follows every rule: foreground dispatch and covering runs, a watched long job."""
    def a(t: float, text: str = "", tools: Sequence[tuple[str, str, dict[str, Any]]] = ()) -> Record:
        return assistant(t, text, tools, version)

    return [
        human(0, "I have a plan at plan.md. Use subagent-driven-development."),
        attachment(1, {"type": "deferred_tools_delta", "addedNames": ["TaskCreate", "TaskUpdate"]}),
        a(10, tools=[SDD_SKILL]),
        result(11, "s1", "Launching skill"),
        a(20, tools=[("a1", "Agent", {"description": "Implement Task 1", "run_in_background": False})]),
        result(300, "a1", "DONE: Task 1 implemented"),
        a(310, tools=[("b1", "Bash", {"command": "python3 -m unittest tests.test_soak_short -v", "timeout": 300000})]),
        result(560, "b1", "OK"),
        a(600, tools=[("b2", "Bash", {"command": LONG_CMD, "run_in_background": True, "timeout": 2400000})]),
        result(601, "b2", BASH_BG),
        a(610, tools=[("b3", "Bash", {"command": WAIT_CMD, "timeout": 600000})]),
        result(1150, "b3", "test_each_key_holds_its_limit ... (still running)"),
        a(1160, tools=[("b4", "Bash", {"command": WAIT_CMD, "timeout": 600000})]),
        enqueue(1330, "b2"),
        result(1345, "b4", "exit=0"),
        *ledger_writes(1390, range(1, 7), version),
        a(1500, tools=[("a2", "Agent", {"description": "Final whole-branch review", "run_in_background": False})]),
        result(1800, "a2", "Ready to merge: yes"),
        a(1900, "All six tasks are complete and merged into main."),
    ]


def make_run(
    root: Path,
    run_id: str,
    records: Sequence[Record],
    *,
    plugin_dir: str,
    model: str = "claude-opus-5-5",
    stops: Sequence[tuple[str, str]] = (),
    final: str = "pass",
    final_reason: str = "",
    gauntlet: dict[str, Any] | None = None,
    checks_pass: bool = True,
    codex_check: bool = True,
    ledger: int = 6,
    evals_commit: str = "e" * 40,
    models: Sequence[str] = ("claude-opus-5-5", "claude-sonnet-5-5"),
) -> Path:
    """Write one run in the relocated layout: ``root/<run>/`` and ``root/workspaces/<run>/``."""
    record = root / run_id
    workspace = root / "workspaces" / run_id
    context = record / "gauntlet-agent" / "context"
    context.mkdir(parents=True)
    (context / "launch-agent").write_text(
        f'exec env HOME=/x claude --dangerously-skip-permissions --plugin-dir "{plugin_dir}" --model "{model}"\n'
    )
    results = record / "gauntlet-agent" / "results" / "r1"
    results.mkdir(parents=True)
    lines = [f'STOP: "{quote}" | {label}' for quote, label in stops] or ["STOP: none"]
    (results / "result.json").write_text(
        json.dumps({"status": final, "criteria": [{"criterion": "Mid-plan stops are listed", "verdict": "pass", "evidence": "\n".join(lines)}]})
    )
    checks = [
        {"check": "command-succeeds", "args": [CODEX_PRECHECK], "negated": False, "passed": codex_check, "detail": None, "phase": "pre"},
        {"check": "command-succeeds", "args": [CODEX_CACHE_CHECK], "negated": False, "passed": codex_check, "detail": None, "phase": "pre"},
        {"check": "command-succeeds", "args": [UNIT_CHECK], "negated": False, "passed": checks_pass, "detail": None, "phase": "post"},
        {"check": "command-succeeds", "args": [SHORT_ON_MAIN], "negated": False, "passed": checks_pass, "detail": None, "phase": "post"},
        {"check": "command-succeeds", "args": [LONG_ON_MAIN], "negated": False, "passed": checks_pass, "detail": None, "phase": "post"},
        {"check": "command-succeeds", "args": [SOAK_CHECK], "negated": False, "passed": checks_pass, "detail": None, "phase": "post"},
    ]
    verdict = {
        "final": final,
        "final_reason": final_reason,
        "gauntlet": gauntlet if gauntlet is not None else {"status": final, "summary": "ok"},
        "checks": checks,
        "provenance": {"evals_commit": evals_commit, "evals_clean": True},
        "economics": {"coding_agent": {"models": [{"model": m} for m in models]}},
    }
    (record / "verdict.json").write_text(json.dumps(verdict))
    write(workspace / "home" / ".claude" / "projects" / "p" / "s.jsonl", records)
    if ledger:
        ledger_path = workspace / "home" / ".cache" / "hyperpowers" / "sdd" / "k" / "plans" / "p" / "progress.md"
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_text("# SDD ledger — plan: plan.md\n" + "".join(f"Task {n}: complete\n" for n in range(1, ledger + 1)))
    return record
