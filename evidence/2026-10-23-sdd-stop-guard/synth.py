"""Synthetic transcript records and run artifacts for the analyzer tests.

Every string here is invented for the tests; nothing comes from a real
session. Timestamps are seconds after a fixed base so a test reads as a
timeline. A run's artifacts are written in the shapes the hyperpowers helpers
commit: the ledger ``sdd-state`` appends to, the receipt ``finish`` stages and
publishes, the plan log and the per-session mirror the Stop hook appends to,
and the job records ``tracked-job`` writes.
"""

from __future__ import annotations

import atexit
import json
import tempfile
from collections.abc import Iterable, Mapping, Sequence
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
SID = "sess-1"
PLAN = "plan.md"
KEY = "k"
WORKSPACE = "p"
RECEIPT_NAME = "p-20261023T100000Z"
SESSION_START = "2026-10-23T09:00:00Z"


def ledger_text(done: Sequence[int] = (), sid: str = SID, plan: str = PLAN) -> str:
    """An SDD ledger: its identity line, the session's own line, one completion line per task.

    The completion lines carry their commit range, because that is the line
    ``sdd-state complete`` appends and the only one a real reader meets.

    :param done: the tasks the ledger records as complete.
    :param sid: the session the ledger belongs to.
    :param plan: the plan the identity line names.
    :returns: the ledger's text, newline-terminated.
    """
    lines = [
        f"# SDD ledger — plan: {plan}",
        f"session {sid}: mode worktree on main at /x started {SESSION_START}",
    ]
    lines += [f"Task {n}: complete (commits {n:07x}..{n + 1:07x}, review clean)" for n in done]
    return "".join(f"{line}\n" for line in lines)


def line(ts: str, decision: str, reason: str, **extra: Any) -> dict[str, Any]:
    """One stop-guard decision line, for the fixture's session and plan.

    :param ts: the decision's timestamp, as the hook writes it.
    :param decision: ``allow`` or ``block``.
    :param reason: one of the spec's reasons.
    :param extra: any key of the line to override, ``session`` and ``plan`` included.
    """
    out: dict[str, Any] = {
        "ts": ts, "session": SID, "decision": decision, "reason": reason, "plan": PLAN,
        "open": 0, "total": 6, "live": [], "refusals": 0, "stop_hook_active": False, "elapsed_ms": 7,
    }
    out.update(extra)
    return out


def _jsonl(path: Path, records: Iterable[Mapping[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("".join(json.dumps(r) + "\n" for r in records))


def _record_dir(path: Path, spec: Mapping[str, Any]) -> Path:
    """One record directory: a ledger, the plan's decision log, and job records.

    The shape a receipt and a live plan workspace share, since ``finish``
    copies a workspace's records into the receipt it publishes.
    """
    path.mkdir(parents=True, exist_ok=True)
    (path / "progress.md").write_text(str(spec.get("ledger") or ledger_text()))
    log = spec.get("log") or []
    if log:
        _jsonl(path / "stop-guard.jsonl", log)
    for n, job in enumerate(spec.get("jobs") or []):
        jobdir = path / "jobs" / f"{job['name']}-x-{n}"
        jobdir.mkdir(parents=True)
        (jobdir / "meta.json").write_text(json.dumps(job))
        if "code" in job:
            (jobdir / "exit").write_text(f"{job['code']}\n")
    return path


def _receipt(root: Path, spec: Mapping[str, Any]) -> Path:
    """One Finish receipt, marked FINISHED when the finish that staged it got that far."""
    path = _record_dir(root / str(spec.get("name") or RECEIPT_NAME), spec)
    if spec.get("finished"):
        (path / "FINISHED").touch()
    return path


_ROOTS: list[tempfile.TemporaryDirectory[str]] = []


def temp_root() -> Path:
    """A throwaway root for a run the caller does not place itself.

    The directory is held until the interpreter exits, so the run stays
    readable for the whole test, and cleaned explicitly, so no implicit
    cleanup warning reaches the suite's output.
    """
    holder = tempfile.TemporaryDirectory(prefix="synth-run-")
    _ROOTS.append(holder)
    atexit.register(holder.cleanup)
    return Path(holder.name)


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
    root: Path | None = None,
    run_id: str = "r1",
    records: Sequence[Record] = (),
    *,
    plugin_dir: str = "/roots/treatment",
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
    sid: str = SID,
    receipt: Mapping[str, Any] | None = None,
    extra_receipts: Sequence[Mapping[str, Any]] = (),
    mirror: Sequence[Mapping[str, Any]] = (),
    workspace_ledger: str | None = None,
    workspace_log: Sequence[Mapping[str, Any]] = (),
    workspace_jobs: Sequence[Mapping[str, Any]] = (),
    extra_workspaces: Sequence[Mapping[str, Any]] = (),
) -> Path:
    """Write one run in the relocated layout: ``root/<run>/`` and ``root/workspaces/<run>/``.

    :param root: where the run goes; a throwaway root when the caller has none.
    :param sid: the session id, which is what the transcript file is named after.
    :param receipt: the receipt Finish published, as ``{"ledger", "log", "jobs",
        "name", "finished"}``; None for a run that never reached Finish.
    :param extra_receipts: further receipts, of other sessions or older stamps.
    :param mirror: the session mirror's decision lines.
    :param workspace_ledger: the live plan workspace's ledger, with its log and jobs.
    :param extra_workspaces: further live workspaces, each a record-directory spec.
    :returns: the record directory.
    """
    root = temp_root() if root is None else root
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
    write(workspace / "home" / ".claude" / "projects" / "p" / f"{sid}.jsonl", records)
    cache = workspace / "home" / ".cache" / "hyperpowers"
    if ledger:
        ledger_path = cache / "sdd" / KEY / "plans" / WORKSPACE / "progress.md"
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_text("# SDD ledger — plan: plan.md\n" + "".join(f"Task {n}: complete\n" for n in range(1, ledger + 1)))
    if receipt is not None:
        _receipt(cache / "receipts", receipt)
    for extra in extra_receipts:
        _receipt(cache / "receipts", extra)
    if mirror:
        _jsonl(cache / "stop-guard" / f"{sid}.jsonl", mirror)
    # The live workspaces sit under the branch backend's key, where the
    # `ledger` argument's older copy sits under the plain backend's: both are
    # layouts a run can leave behind, and the readers glob over both.
    plans = cache / "state" / KEY / "plans"
    if workspace_ledger is not None or workspace_log or workspace_jobs:
        _record_dir(plans / WORKSPACE, {"ledger": workspace_ledger, "log": workspace_log, "jobs": workspace_jobs})
    for n, extra in enumerate(extra_workspaces):
        _record_dir(plans / str(extra.get("name") or f"{WORKSPACE}{n + 2}"), extra)
    return record
