"""Guard: refuse to run a claude eval from inside a Claude Code session.

Claude Code injects CLAUDECODE=1 into the env of processes it spawns. A `claude`
agent-under-test launched from such a process is treated by Claude Code
(>=2.1.166) as a nested interactive session and skips persisting its transcript,
so quorum captures nothing and every claude run goes indeterminate. We detect
this and bail loudly rather than produce silently-broken results.
"""

import pytest

from quorum.runner import (
    NestedClaudeCodeError,
    RunnerError,
    guard_against_nested_claude_code,
    running_inside_claude_code,
)


def test_running_inside_claude_code_true_when_claudecode_set():
    assert running_inside_claude_code(env={"CLAUDECODE": "1"}) is True


def test_running_inside_claude_code_false_when_unset_or_empty():
    assert running_inside_claude_code(env={}) is False
    assert running_inside_claude_code(env={"CLAUDECODE": ""}) is False


def test_guard_raises_when_nested_and_claude_requested():
    with pytest.raises(NestedClaudeCodeError):
        guard_against_nested_claude_code(["claude", "codex"], env={"CLAUDECODE": "1"})


def test_guard_raises_when_nested_and_agent_set_defaults_to_all():
    # run-all with no --coding-agents filter means every agent, incl. claude.
    with pytest.raises(NestedClaudeCodeError):
        guard_against_nested_claude_code(None, env={"CLAUDECODE": "1"})


def test_guard_quiet_when_nested_but_claude_not_requested():
    # A codex-only eval is unaffected by CLAUDECODE — must not bail.
    guard_against_nested_claude_code(["codex"], env={"CLAUDECODE": "1"})


def test_guard_quiet_when_not_nested():
    guard_against_nested_claude_code(["claude"], env={})


def test_guard_error_is_actionable_and_is_a_runner_error():
    with pytest.raises(RunnerError) as exc:
        guard_against_nested_claude_code(["claude"], env={"CLAUDECODE": "1"})
    assert "outside Claude Code" in str(exc.value)
