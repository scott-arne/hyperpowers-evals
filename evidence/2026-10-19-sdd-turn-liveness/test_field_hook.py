"""Tests for field_hook.py: the stop guard's record over the field cohort."""

from __future__ import annotations

import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any
from unittest import mock

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import field
import field_hook
from liveness import parse_ts
from synth import at, write
from test_field import SINCE, UNTIL, session


def decision(t: float, kind: str, reason: str, **extra: Any) -> dict[str, Any]:
    return {"ts": at(t), "session": "zed", "decision": kind, "reason": reason, "plan": "plan.md", "open": 1, "total": 2, "live": [], "refusals": 0, "stop_hook_active": False, "elapsed_ms": 3, **extra}


class Collect(unittest.TestCase):
    def test_counts_blocks_allows_and_misses_for_the_cohort(self) -> None:
        lines = [
            decision(100, "block", "open-tasks", refusals=1),
            decision(111, "allow", "handback-text"),  # within a minute of the premature stop at 110: a miss
            decision(200, "allow", "cap"),
            decision(300, "allow", "log-failed"),
            {"ts": at(400), "session": "zed", "decision": "allow", "reason": "hook-error", "detail": "module exit 1"},
            decision(1005, "allow", "handback-text", mirror_failed=True),  # the stop at 1010 asks: not a miss
            decision(-100000, "block", "open-tasks"),  # outside the window
        ]
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp) / "projects"
            mirrors = Path(tmp) / "stop-guard"
            mirrors.mkdir()
            write(projects / "p1" / "zed.jsonl", session())
            (mirrors / "zed.jsonl").write_text("\n".join(json.dumps(line) for line in lines) + "\nnot json\n")
            (mirrors / "stranger.jsonl").write_text(json.dumps(decision(100, "block", "open-tasks")) + "\n")
            out = field_hook.collect(projects, mirrors, SINCE, UNTIL)
            base = field.collect(projects, SINCE, UNTIL)
        self.assertEqual((out["sessions"], out["sessions_with_log"]), (1, 1))
        self.assertEqual(out["boundaries"], base["boundaries"])
        self.assertEqual(out["blocks"], 1)
        self.assertEqual(out["blocks_per_100"], round(100 * 1 / base["boundaries"], 2))
        self.assertEqual(out["allows"], {"cap": 1, "handback-text": 2, "hook-error": 1, "log-failed": 1})
        self.assertEqual((out["cap"], out["log_failed"], out["hook_error"], out["mirror_failed"]), (1, 1, 1, 1))
        self.assertEqual([(m["session"], m["ts"]) for m in out["misses"]], [("zed", at(111))])

    def test_a_session_contributes_only_decisions_from_its_first_in_window_invocation(self) -> None:
        # Correction 8 starts the transcript measure at the session's first
        # in-window SDD invocation, so the hook's record starts there too:
        # counting an earlier decision would put it over a denominator that
        # excludes its interval.
        lines = [decision(-3600, "block", "open-tasks"), decision(100, "block", "open-tasks")]
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp) / "projects"
            mirrors = Path(tmp) / "stop-guard"
            mirrors.mkdir()
            write(projects / "p1" / "zed.jsonl", session())
            mirror = mirrors / "zed.jsonl"
            mirror.write_text("".join(json.dumps(line) + "\n" for line in lines))
            # Both lines are inside the window; the session's bound drops the first.
            self.assertEqual(len(field_hook.mirror_lines(mirror, SINCE, UNTIL)), 2)
            out = field_hook.collect(projects, mirrors, SINCE, UNTIL)
        self.assertEqual((out["blocks"], out["sessions_with_log"]), (1, 1))

    def test_two_wrapper_hook_errors_in_one_second_are_two_stops(self) -> None:
        # The wrapper's line carries a whole-second `date -u` stamp and no
        # sequence field, so file order is the only thing separating them.
        line = {"ts": "2026-10-20T10:05:00Z", "session": "zed", "decision": "allow", "reason": "hook-error", "detail": "module exit 1"}
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp) / "projects"
            mirrors = Path(tmp) / "stop-guard"
            mirrors.mkdir()
            write(projects / "p1" / "zed.jsonl", session())
            (mirrors / "zed.jsonl").write_text((json.dumps(line) + "\n") * 2)
            out = field_hook.collect(projects, mirrors, SINCE, UNTIL)
        self.assertEqual((out["allows"], out["hook_error"]), ({"hook-error": 2}, 2))

    def test_a_cohort_session_without_a_mirror_counts_as_a_session_without_a_log(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp) / "projects"
            mirrors = Path(tmp) / "stop-guard"
            write(projects / "p1" / "zed.jsonl", session())
            out = field_hook.collect(projects, mirrors, SINCE, UNTIL)
        self.assertEqual((out["sessions"], out["sessions_with_log"], out["blocks"], out["misses"]), (1, 0, 0, []))


class Units(unittest.TestCase):
    def test_mirror_lines_keeps_well_formed_in_window_lines_only(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "s.jsonl"
            p.write_text(json.dumps(decision(10, "block", "open-tasks")) + "\n{\"ts\":\"nope\"}\n[1]\n" + json.dumps(decision(-100000, "allow", "cap")) + "\n")
            self.assertEqual([d["reason"] for d in field_hook.mirror_lines(p, SINCE, UNTIL)], ["open-tasks"])
        self.assertEqual(field_hook.mirror_lines(Path(tmp) / "missing.jsonl", SINCE, UNTIL), [])

    def test_malformed_lines_are_counted_and_never_fatal(self) -> None:
        # The accepted residuals: a glued concurrent append and a torn write.
        raw = (
            json.dumps(decision(100, "block", "open-tasks")).encode()[:-3]
            + json.dumps(decision(101, "allow", "cap")).encode()
            + b"\n[1]\n"
            + b'{"ts": "\xff2026-10-20T10:00:00Z"}\n'
            + b"\n"
        )
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp) / "projects"
            mirrors = Path(tmp) / "stop-guard"
            mirrors.mkdir()
            write(projects / "p1" / "zed.jsonl", session())
            (mirrors / "zed.jsonl").write_bytes(raw)
            out = field_hook.collect(projects, mirrors, SINCE, UNTIL)
        # The blank line carries no decision and is not a lost one.
        self.assertEqual((out["malformed"], out["blocks"], out["sessions_with_log"]), (3, 0, 0))

    def test_a_line_that_is_not_a_placeable_decision_is_malformed(self) -> None:
        # An offset-less timestamp cannot be compared with the window at all,
        # and a line without a decision is not one: each costs its own line.
        naive = {**decision(100, "block", "open-tasks"), "ts": "2026-10-20T10:01:40"}
        headless = {k: v for k, v in decision(101, "allow", "cap").items() if k != "decision"}
        unknown = {**decision(102, "allow", "cap"), "decision": "defer"}
        good = decision(103, "block", "open-tasks")
        with tempfile.TemporaryDirectory() as tmp:
            projects = Path(tmp) / "projects"
            mirrors = Path(tmp) / "stop-guard"
            mirrors.mkdir()
            write(projects / "p1" / "zed.jsonl", session())
            (mirrors / "zed.jsonl").write_text("".join(json.dumps(line) + "\n" for line in [naive, headless, unknown, good]))
            out = field_hook.collect(projects, mirrors, SINCE, UNTIL)
        self.assertEqual((out["malformed"], out["blocks"], out["allows"], out["cap"]), (3, 1, {}, 0))

    def test_the_default_mirror_dir_is_the_hooks_cache_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            cache = Path(tmp) / "xdg"
            mirrors = cache / "hyperpowers" / "stop-guard"
            mirrors.mkdir(parents=True)
            projects = Path(tmp) / "projects"
            write(projects / "p1" / "zed.jsonl", session())
            (mirrors / "zed.jsonl").write_text(json.dumps(decision(111, "allow", "handback-text")) + "\n")
            out = io.StringIO()
            with mock.patch.dict(os.environ, {"XDG_CACHE_HOME": str(cache)}), contextlib.redirect_stdout(out):
                self.assertEqual(field_hook.default_mirror_dir(), mirrors)
                rc = field_hook.main(["--since", SINCE.isoformat(), "--until", UNTIL.isoformat(), "--projects", str(projects)])
            home = dict(os.environ, HOME=tmp)
            home.pop("XDG_CACHE_HOME", None)
            with mock.patch.dict(os.environ, home, clear=True):
                self.assertEqual(field_hook.default_mirror_dir(), Path(tmp) / ".cache" / "hyperpowers" / "stop-guard")
        got = json.loads(out.getvalue())
        self.assertEqual((rc, got["sessions_with_log"], [m["ts"] for m in got["misses"]]), (0, 1, [at(111)]))

    def test_misses_are_hand_back_allows_that_follow_a_premature_stop_within_a_minute(self) -> None:
        # 50 precedes the stop at 110 (an earlier stop's allow), 112 is a cap, 200 is past the minute: only 111 is a miss.
        lines = [decision(50, "allow", "handback-line"), decision(111, "allow", "handback-text"), decision(112, "allow", "cap"), decision(200, "allow", "handback-text")]
        self.assertEqual([m["ts"] for m in field_hook.misses(lines, [parse_ts(at(110))])], [at(111)])
        self.assertEqual([m["ts"] for m in field_hook.misses([decision(109, "allow", "handback-text")], [parse_ts(at(110))])], [at(109)])
        self.assertEqual(field_hook.misses(lines, []), [])


if __name__ == "__main__":
    unittest.main()
