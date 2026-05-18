"""Tests for drill.token_capture."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from harness.token_usage import (
    CLAUDE_OPUS_PRICING,
    CODEX_GPT55_PRICING,
    capture_tokens,
    estimate_claude_cost,
    estimate_codex_cost,
    parse_claude_session,
    parse_codex_rollout,
)

FIXTURES = Path(__file__).parent / "fixtures"


class TestParseClaudeSession:
    def test_sums_usage_across_assistant_messages(self):
        usage = parse_claude_session(FIXTURES / "cc_session.jsonl")
        assert usage is not None
        assert usage["total_input"] == 150
        assert usage["total_cache_create"] == 1000
        assert usage["total_cache_read"] == 1150
        assert usage["total_output"] == 50
        # total_tokens = input + cache_create + cache_read + output
        assert usage["total_tokens"] == 150 + 1000 + 1150 + 50
        assert usage["model"] == "claude-opus-4-7"
        # 3 assistant messages total, only 2 carry usage; we count assistant turns
        assert usage["n_assistant_turns"] == 3
        # tool_result_total_bytes: "AAAAA"(5) + "plain string output of 25 chars"(31) = 36
        assert usage["tool_result_total_bytes"] == 36

    def test_handles_missing_file(self, tmp_path: Path):
        missing = tmp_path / "nope.jsonl"
        usage = parse_claude_session(missing)
        assert usage is None

    def test_skips_messages_without_usage(self, tmp_path: Path):
        f = tmp_path / "sparse.jsonl"
        # An assistant message with no usage block must not crash and contributes 0 tokens
        f.write_text(
            json.dumps(
                {
                    "type": "assistant",
                    "message": {
                        "model": "claude-opus-4-7",
                        "role": "assistant",
                        "content": [{"type": "text", "text": "hi"}],
                    },
                }
            )
            + "\n"
        )
        usage = parse_claude_session(f)
        assert usage is not None
        assert usage["total_input"] == 0
        assert usage["total_output"] == 0
        assert usage["n_assistant_turns"] == 1
        assert usage["tool_result_total_bytes"] == 0


class TestParseCodexRollout:
    def test_uses_last_token_count_for_cumulative(self):
        usage = parse_codex_rollout(FIXTURES / "codex_rollout.jsonl")
        assert usage is not None
        # Last cumulative: input=2000 cached=900 output=120
        assert usage["total_input"] == 1100  # uncached
        assert usage["total_cache_read"] == 900
        assert usage["total_cache_create"] == 0
        assert usage["total_output"] == 120
        assert usage["total_tokens"] == 2120
        assert usage["model"] == "gpt-5.5"
        # one agent_message
        assert usage["n_assistant_turns"] == 1
        # function_call_output bytes: "file1.txt\nfile2.txt\n"(20) + "x"(1) = 21
        assert usage["tool_result_total_bytes"] == 21
        # Codex never reports cache writes - flag this so consumers know
        assert usage["cache_create_unavailable"] is True

    def test_handles_missing_file(self, tmp_path: Path):
        usage = parse_codex_rollout(tmp_path / "nope.jsonl")
        assert usage is None

    def test_handles_rollout_with_no_token_count(self, tmp_path: Path):
        f = tmp_path / "no_tokens.jsonl"
        f.write_text(
            json.dumps({"type": "session_meta", "payload": {"id": "x", "cwd": "/tmp"}}) + "\n"
        )
        usage = parse_codex_rollout(f)
        assert usage is not None
        assert usage["total_tokens"] == 0
        assert usage["total_input"] == 0


class TestCostEstimation:
    def test_claude_cost_uses_constants(self):
        # Per Opus 4.x list pricing constants
        usage = {
            "total_input": 1_000_000,
            "total_cache_create": 0,
            "total_cache_read": 0,
            "total_output": 0,
        }
        cost = estimate_claude_cost(usage)
        assert cost == pytest.approx(CLAUDE_OPUS_PRICING["input_per_m"])

    def test_claude_cost_includes_all_components(self):
        usage = {
            "total_input": 150,
            "total_cache_create": 1000,
            "total_cache_read": 1150,
            "total_output": 50,
        }
        expected = (
            150 * CLAUDE_OPUS_PRICING["input_per_m"] / 1_000_000
            + 1000 * CLAUDE_OPUS_PRICING["cache_create_per_m"] / 1_000_000
            + 1150 * CLAUDE_OPUS_PRICING["cache_read_per_m"] / 1_000_000
            + 50 * CLAUDE_OPUS_PRICING["output_per_m"] / 1_000_000
        )
        assert estimate_claude_cost(usage) == pytest.approx(expected)

    def test_codex_cost_uses_constants(self):
        usage = {"total_input": 1_000_000, "total_cache_read": 0, "total_output": 0}
        cost = estimate_codex_cost(usage)
        assert cost == pytest.approx(CODEX_GPT55_PRICING["input_per_m"])

    def test_codex_cost_uses_separate_cached_rate(self):
        usage = {"total_input": 0, "total_cache_read": 1_000_000, "total_output": 0}
        cost = estimate_codex_cost(usage)
        assert cost == pytest.approx(CODEX_GPT55_PRICING["cache_read_per_m"])


class TestCaptureTokens:
    def test_claude_family_returns_full_dict(self):
        result = capture_tokens(
            backend_family="claude",
            session_log_files=[FIXTURES / "cc_session.jsonl"],
        )
        assert result is not None
        assert result["total_input"] == 150
        assert result["total_output"] == 50
        assert result["total_cache_create"] == 1000
        assert result["total_cache_read"] == 1150
        assert result["total_tokens"] == 2350
        assert result["est_cost_usd"] > 0
        assert result["model"] == "claude-opus-4-7"
        assert result["n_assistant_turns"] == 3
        assert result["tool_result_total_bytes"] == 36

    def test_codex_family_returns_full_dict(self):
        result = capture_tokens(
            backend_family="codex",
            session_log_files=[FIXTURES / "codex_rollout.jsonl"],
        )
        assert result is not None
        assert result["total_input"] == 1100
        assert result["total_cache_read"] == 900
        assert result["total_cache_create"] == 0
        assert result["total_output"] == 120
        assert result["est_cost_usd"] > 0
        assert result["cache_create_unavailable"] is True

    def test_unknown_backend_returns_none(self):
        result = capture_tokens(backend_family="other", session_log_files=[])
        assert result is None

    def test_missing_files_returns_none(self):
        result = capture_tokens(backend_family="claude", session_log_files=[])
        assert result is None

    def test_aggregates_multiple_claude_files(self, tmp_path: Path):
        # Two CC session files (e.g., main + subagent) should be summed
        f1 = tmp_path / "a.jsonl"
        f2 = tmp_path / "b.jsonl"
        for f, n_in in [(f1, 100), (f2, 200)]:
            f.write_text(
                json.dumps(
                    {
                        "type": "assistant",
                        "message": {
                            "model": "claude-opus-4-7",
                            "role": "assistant",
                            "content": [{"type": "text", "text": "x"}],
                            "usage": {
                                "input_tokens": n_in,
                                "cache_creation_input_tokens": 0,
                                "cache_read_input_tokens": 0,
                                "output_tokens": 10,
                            },
                        },
                    }
                )
                + "\n"
            )
        result = capture_tokens(backend_family="claude", session_log_files=[f1, f2])
        assert result is not None
        assert result["total_input"] == 300
        assert result["total_output"] == 20
        assert result["n_assistant_turns"] == 2
