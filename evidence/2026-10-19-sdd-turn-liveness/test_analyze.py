"""Tests for analyze.py on synthetic runs."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import analyze
import liveness
from synth import (
    BASH_BG,
    LEDGER,
    LONG_CMD,
    WAIT_CMD,
    assistant,
    at,
    control_records,
    enqueue,
    human,
    make_run,
    result,
    treatment_records,
    write,
)

CONTROL_STOPS = (("Moving to Task 3.", "neither"),)


def drop_call(records: list[dict[str, Any]], tool_id: str) -> list[dict[str, Any]]:
    """The records without one tool call and its result."""
    def mentions(rec: dict[str, Any]) -> bool:
        return any(b.get("id") == tool_id or b.get("tool_use_id") == tool_id for b in liveness.blocks(rec))

    return [r for r in records if not mentions(r)]


def long_job(
    watch_result: str = "exit=0", turn_end: bool = False, watch: bool = True, done_at: float = 1345
) -> list[dict[str, Any]]:
    recs = [
        human(0, "go"),
        assistant(600, tools=[("b2", "Bash", {"command": LONG_CMD, "run_in_background": True, "timeout": 2400000})]),
        result(601, "b2", BASH_BG),
    ]
    if turn_end:
        recs += [assistant(605, "Waiting for the long soak."), human(700, "continue")]
    if watch:
        recs.append(assistant(710, tools=[("b4", "Bash", {"command": WAIT_CMD, "timeout": 600000})]))
    recs.append(enqueue(done_at - 15, "b2"))
    if watch:
        recs.append(result(done_at, "b4", watch_result))
    recs.append(assistant(done_at + 5, "The long soak finished."))
    return recs


class Measure(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def run_of(self, run_id: str, records: list[dict[str, Any]], **kw: Any) -> dict[str, Any]:
        kw.setdefault("plugin_dir", "/roots/treatment")
        return analyze.measure(make_run(self.root, run_id, records, **kw), {})

    def test_treatment_like_run_meets_every_measure(self) -> None:
        m = self.run_of("t1", treatment_records())
        self.assertEqual((m["dispatch_fg"], m["dispatch_bg"], m["dispatch_unclassified"]), (2, 0, 0))
        self.assertTrue(m["short_ok"])
        self.assertTrue(m["long_ok"])
        self.assertEqual((m["premature"], m["unadjudicated"], m["censored_stops"]), (0, 0, 0))
        self.assertEqual(m["live_turn_ends"], [])
        self.assertEqual(m["untracked"], [])
        self.assertTrue(m["plan_complete"] and m["final_review"] and m["success"])
        self.assertEqual((m["plugin_dir"], m["model"], m["cc"]), ("/roots/treatment", "claude-opus-5-5", "2.1.300"))
        self.assertTrue(m["task_tools"])
        self.assertTrue(m["codex_absent"])

    def test_control_like_run(self) -> None:
        m = self.run_of("c1", control_records(), plugin_dir="/roots/control", stops=CONTROL_STOPS)
        self.assertEqual((m["dispatch_fg"], m["dispatch_bg"]), (0, 2))
        self.assertEqual(m["premature"], 1)
        self.assertEqual(m["candidates"][0]["at"], liveness.parse_ts(at(210)).isoformat())
        self.assertTrue(m["candidates"][0]["continue_reply"])
        self.assertFalse(m["candidates"][0]["heuristic"])
        self.assertEqual(len(m["live_turn_ends"]), 1)
        self.assertEqual(m["live_turn_ends"][0]["idle_seconds"], 170.0)
        self.assertFalse(m["short_ok"])
        self.assertFalse(m["long_ok"])
        self.assertEqual([u["where"] for u in m["untracked"]], ["command"])
        self.assertTrue(m["success"])

    def test_unmatched_candidate_needs_adjudication(self) -> None:
        record = make_run(self.root, "c2", control_records(), plugin_dir="/roots/control")
        m = analyze.measure(record, {})
        self.assertEqual((m["premature"], m["unadjudicated"]), (0, 1))
        key = ("c2", liveness.parse_ts(at(210)).isoformat())
        m = analyze.measure(record, {key: "neither"})
        self.assertEqual((m["premature"], m["unadjudicated"]), (1, 0))
        self.assertEqual(m["candidates"][0]["source"], "adjudication")

    def test_listed_question_is_not_premature(self) -> None:
        m = self.run_of("c3", control_records(), plugin_dir="/roots/control", stops=(("Moving to Task 3.", "question"),))
        self.assertEqual(m["premature"], 0)

    def test_dispatch_needs_the_explicit_false_and_a_clean_result(self) -> None:
        records = treatment_records()
        records += [
            assistant(2000, tools=[("x1", "Agent", {"description": "Review Task 2"})]),
            result(2100, "x1", "DONE: reviewed"),
            assistant(2110, tools=[("x2", "Agent", {"description": "Fix Task 2", "run_in_background": False})]),
            result(2120, "x2", "API Error", is_error=True),
        ]
        m = self.run_of("t5", records)
        self.assertEqual((m["dispatch_fg"], m["dispatch_bg"], m["dispatch_unclassified"]), (2, 0, 2))

    def test_plan_completion_reads_the_ledger_writes_or_the_ledger(self) -> None:
        final_review = liveness.parse_ts(at(1500)).isoformat()
        # SDD's Finish deletes the workspace, so a finished run has no ledger file.
        m = self.run_of("p1", treatment_records(), ledger=0)
        self.assertEqual((m["plan_complete"], m["ledger_marks"]), (True, [1, 2, 3, 4, 5, 6]))
        self.assertEqual(m["plan_at"], liveness.parse_ts(at(1400)).isoformat())
        five = drop_call(treatment_records(), "lw6")
        self.assertFalse(self.run_of("p2", five, ledger=0)["plan_complete"])
        self.assertFalse(self.run_of("p3", five, ledger=5)["plan_complete"])
        m = self.run_of("p4", five, ledger=6)
        self.assertEqual((m["plan_complete"], m["plan_at"]), (True, final_review))
        grep = five[:-1] + [
            assistant(1402, tools=[("g6", "Bash", {"command": f"grep 'Task 6: complete' {LEDGER}"})]),
            result(1403, "g6", "Task 6: complete"),
            five[-1],
        ]
        self.assertFalse(self.run_of("p5", grep, ledger=0)["plan_complete"])
        failed = five[:-1] + [
            assistant(1404, tools=[("f6", "Bash", {"command": f"echo 'Task 6: complete' >> {LEDGER}"})]),
            result(1405, "f6", "permission denied", is_error=True),
            five[-1],
        ]
        self.assertFalse(self.run_of("p6", failed, ledger=0)["plan_complete"])
        elsewhere = five[:-1] + [
            assistant(1406, tools=[("n6", "Bash", {"command": "echo 'Task 6: complete' >> notes.md"})]),
            result(1407, "n6", ""),
            five[-1],
        ]
        self.assertFalse(self.run_of("p7", elsewhere, ledger=0)["plan_complete"])
        edited = five[:-1] + [
            assistant(1408, tools=[("e6", "Edit", {"file_path": LEDGER, "old_string": "x", "new_string": "Task 6: complete (abc123)"})]),
            result(1409, "e6", "edited"),
            five[-1],
        ]
        m = self.run_of("p8", edited, ledger=0)
        self.assertEqual((m["plan_complete"], m["plan_at"]), (True, liveness.parse_ts(at(1408)).isoformat()))

    def test_long_job_needs_a_foreground_watch_that_saw_exit_zero(self) -> None:
        self.assertTrue(self.run_of("l1", long_job())["long_ok"])
        self.assertFalse(self.run_of("l2", long_job(watch_result="exit=1"))["long_ok"])
        self.assertFalse(self.run_of("l3", long_job(turn_end=True))["long_ok"])
        self.assertFalse(self.run_of("l4", long_job(watch=False))["long_ok"])
        # Deviation 6: an exit=0 seen 300 s after launch is too fast for a 720 s soak.
        self.assertFalse(self.run_of("l5", long_job(done_at=900))["long_ok"])

    def test_short_run_must_take_real_time(self) -> None:
        fast = [result(340, "b1", "OK") if r.get("timestamp") == at(560) else r for r in treatment_records()]
        m = self.run_of("s1", fast)
        self.assertEqual(m["short_runs"][0]["elapsed"], 30.0)
        self.assertFalse(m["short_ok"])

    def test_soak_file_writes_fail_success(self) -> None:
        edit = treatment_records() + [
            assistant(2000, tools=[("e1", "Edit", {"file_path": "/x/coding-agent-workdir/tests/test_soak_short.py", "old_string": "240", "new_string": "5"})]),
            result(2001, "e1", "edited"),
        ]
        m = self.run_of("k1", edit)
        self.assertTrue(m["soak_tampered"])
        self.assertFalse(m["success"])
        sed = treatment_records() + [
            assistant(2000, tools=[("e2", "Bash", {"command": "sed -i '' 's/720/5/' tests/test_soak_long.py"})]),
            result(2001, "e2", ""),
        ]
        self.assertTrue(self.run_of("k2", sed)["soak_tampered"])
        read = treatment_records() + [
            assistant(2000, tools=[("e3", "Bash", {"command": "cat tests/test_soak_long.py"})]),
            result(2001, "e3", "SOAK_SECONDS = 720"),
        ]
        self.assertFalse(self.run_of("k3", read)["soak_tampered"])
        self.assertFalse(self.run_of("k4", treatment_records())["soak_tampered"])

    def test_codex_needs_the_affirmative_precheck(self) -> None:
        self.assertFalse(self.run_of("t2", treatment_records(), codex_check=False)["codex_absent"])
        records = treatment_records()
        records.insert(4, assistant(15, tools=[("c9", "Bash", {"command": 'node "$C/scripts/codex-companion.mjs" status --json'})]))
        records.insert(5, result(16, "c9", "{}"))
        self.assertFalse(self.run_of("t3", records)["codex_absent"])

    def test_failed_post_check_is_not_success(self) -> None:
        m = self.run_of("t4", treatment_records(), checks_pass=False)
        self.assertFalse(m["unit_tests_passed"])
        self.assertFalse(m["soak_tests_passed"])
        self.assertFalse(m["success"])

    def test_void_kinds_fail_closed(self) -> None:
        self.assertEqual(analyze.void_kind({"final": "indeterminate", "final_reason": "quorum error (setup): setup.sh failed", "gauntlet": {}}), "void-setup")
        self.assertEqual(
            analyze.void_kind({"final": "indeterminate", "gauntlet": {"status": "investigate", "summary": "gauntlet exited (status 1) without writing a result"}}),
            "void-grader",
        )
        self.assertEqual(analyze.void_kind({"final": "indeterminate", "final_reason": "API error", "gauntlet": {"status": "investigate"}}), "void-other")
        self.assertEqual(analyze.void_kind({"final": None}), "void-other")
        self.assertIsNone(analyze.void_kind({"final": "fail"}))

    def test_legacy_layout_reads_its_own_home(self) -> None:
        record = self.root / "legacy"
        (record / "home").mkdir(parents=True)
        self.assertEqual(analyze.workspace_of(record), record)


class Untracked(unittest.TestCase):
    def test_shell_spellings(self) -> None:
        cases = [
            ("python3 -m unittest tests.test_soak_long -v > out 2>&1", False),
            ("sleep 100 &", True),
            ("make && make test", False),
            ("nohup python3 x.py > o 2>&1", True),
            ("echo 'nohup sleep &'", False),
            ("cat > s.sh <<'EOF'\nnohup sleep 9 &\nEOF", False),
            ("python3 -c 'import subprocess; subprocess.Popen([\"x\"], start_new_session=True)'", True),
            ("setsid python3 x.py", True),
            ("grep -n setsid notes.md", False),
            ("ls &>/dev/null", False),
            ("cmd; disown", True),
        ]
        for command, expected in cases:
            with self.subTest(command=command):
                self.assertEqual(analyze.shell_detaches(command), expected)

    def test_executed_session_written_scripts_are_flagged(self) -> None:
        records = treatment_records()
        records += [
            assistant(2000, tools=[("w1", "Write", {"file_path": "/nowhere/run.sh", "content": "nohup sleep 1 &\n"})]),
            result(2001, "w1", "written"),
            assistant(2002, tools=[("w2", "Bash", {"command": "bash /nowhere/run.sh"})]),
            result(2003, "w2", ""),
            assistant(2010, tools=[("w3", "Bash", {"command": "cat > /nowhere/go.sh <<'EOF'\nsetsid sleep 5\nEOF"})]),
            result(2011, "w3", ""),
            assistant(2012, tools=[("w4", "Bash", {"command": "sh /nowhere/go.sh"})]),
            result(2013, "w4", ""),
            assistant(2020, tools=[("w5", "Write", {"file_path": "/nowhere/idle.sh", "content": "nohup sleep 1 &\n"})]),
            result(2021, "w5", "written"),
            assistant(2030, tools=[("w6", "Bash", {"command": "printf 'nohup sleep 2 &\\n' > /nowhere/r.sh"})]),
            result(2031, "w6", ""),
            assistant(2032, tools=[("w7", "Bash", {"command": "bash /nowhere/r.sh"})]),
            result(2033, "w7", ""),
            assistant(2040, tools=[("w8", "Edit", {"file_path": "/x/coding-agent-workdir/tools/e.sh", "old_string": "a", "new_string": "b"})]),
            result(2041, "w8", "edited"),
            assistant(2042, tools=[("w9", "Bash", {"command": "sh tools/e.sh"})]),
            result(2043, "w9", ""),
            assistant(2050, tools=[("wa", "Bash", {"command": "bash -c 'nohup sleep 9 &'"})]),
            result(2051, "wa", ""),
            assistant(2060, tools=[("wb", "Bash", {"command": "cat > /nowhere/inline.sh <<'EOF'\nnohup sleep 7 &\nEOF\nbash /nowhere/inline.sh"})]),
            result(2061, "wb", ""),
            assistant(2062, tools=[("wc", "Bash", {"command": "printf 'setsid sleep 1\\n' > /nowhere/r2.sh && sh /nowhere/r2.sh"})]),
            result(2063, "wc", ""),
        ]
        with tempfile.TemporaryDirectory() as tmp:
            record = make_run(Path(tmp), "t9", records, plugin_dir="/roots/treatment")
            edited = Path(tmp) / "workspaces" / "t9" / "coding-agent-workdir" / "tools" / "e.sh"
            edited.parent.mkdir(parents=True)
            edited.write_text("setsid sleep 3\n")
            found = analyze.measure(record, {})["untracked"]
        files = sorted(u["detail"] for u in found if u["where"] == "file")
        self.assertEqual(
            files,
            [
                "/nowhere/go.sh",
                "/nowhere/inline.sh",
                "/nowhere/r.sh",
                "/nowhere/r2.sh",
                "/nowhere/run.sh",
                "/x/coding-agent-workdir/tools/e.sh",
            ],
        )
        self.assertEqual([u["detail"] for u in found if u["where"] == "command"], ["bash -c 'nohup sleep 9 &'"])

    def test_soak_execution_matching(self) -> None:
        self.assertTrue(analyze.runs_soak("python3 -m unittest tests.test_soak_short -v", "test_soak_short"))
        self.assertTrue(analyze.runs_soak("python3 -m unittest discover -s tests", "test_soak_long"))
        self.assertFalse(analyze.runs_soak('python3 -m unittest discover -s tests -p "test_unit_*.py"', "test_soak_long"))
        self.assertFalse(analyze.runs_soak("grep test_soak_short plan.md", "test_soak_short"))


class Summary(unittest.TestCase):
    def test_transcript_summary_counts_every_pre_completion_stop(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = write(Path(tmp) / "s.jsonl", control_records())
            summary = analyze.transcript_summary(path)
        self.assertEqual((summary["dispatch_fg"], summary["dispatch_bg"]), (0, 2))
        self.assertEqual(summary["live_turn_ends_before_completion"], 1)
        self.assertEqual(summary["censored_stops"], 0)
        self.assertEqual([c["at"] for c in summary["stops_before_completion"]], [liveness.parse_ts(at(210)).isoformat()])
        self.assertEqual(summary["plan_at"], liveness.parse_ts(at(2100)).isoformat())


if __name__ == "__main__":
    unittest.main()
