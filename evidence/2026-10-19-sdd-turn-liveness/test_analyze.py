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
        last_write = liveness.parse_ts(at(1398)).isoformat()
        # SDD's Finish deletes the workspace, so a finished run has no ledger file.
        m = self.run_of("p1", treatment_records(), ledger=0)
        self.assertEqual((m["plan_complete"], m["ledger_marks"]), (True, [1, 2, 3, 4, 5, 6]))
        self.assertEqual(m["plan_at"], liveness.parse_ts(at(1400)).isoformat())
        five = drop_call(treatment_records(), "lw6")
        self.assertFalse(self.run_of("p2", five, ledger=0)["plan_complete"])
        self.assertFalse(self.run_of("p3", five, ledger=5)["plan_complete"])
        m = self.run_of("p4", five, ledger=6)
        self.assertEqual((m["plan_complete"], m["plan_at"], m["final_review"]), (True, last_write, True))
        stray = five[:-1] + [
            assistant(1416, tools=[("x6", "Bash", {"command": f"echo 'Task 6: complete' >> notes.md; test -f {LEDGER}"})]),
            result(1417, "x6", ""),
            assistant(1418, tools=[("x7", "Write", {"file_path": "/x/coding-agent-workdir/progress.md", "content": "Task 6: complete\n"})]),
            result(1419, "x7", "written"),
            five[-1],
        ]
        self.assertFalse(self.run_of("p12", stray, ledger=0)["plan_complete"])
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
        appended = five[:-1] + [
            assistant(1410, tools=[("e7", "Edit", {
                "file_path": LEDGER,
                "old_string": "Task 5: complete (def456)",
                "new_string": "Task 5: complete (def456)\nTask 6: complete (abc123)",
            })]),
            result(1411, "e7", "edited"),
            five[-1],
        ]
        m = self.run_of("p9", appended, ledger=0)
        self.assertEqual((m["plan_complete"], m["plan_at"]), (True, liveness.parse_ts(at(1410)).isoformat()))
        rewritten = drop_call(five, "lw5")[:-1] + [
            assistant(1412, tools=[("w7", "Write", {
                "file_path": LEDGER,
                "content": "# SDD ledger\n" + "".join(f"Task {n}: complete\n" for n in range(1, 7)),
            })]),
            result(1413, "w7", "written"),
            five[-1],
        ]
        self.assertEqual(self.run_of("p10", rewritten, ledger=0)["ledger_marks"], [1, 2, 3, 4, 5, 6])
        old_only = five[:-1] + [
            assistant(1414, tools=[("e8", "Edit", {"file_path": LEDGER, "old_string": "Task 6: complete", "new_string": ""})]),
            result(1415, "e8", "edited"),
            five[-1],
        ]
        self.assertFalse(self.run_of("p11", old_only, ledger=0)["plan_complete"])

    def test_bash_ledger_writes_in_every_shell_spelling(self) -> None:
        five = drop_call(treatment_records(), "lw6")
        folder = LEDGER.rsplit("/", 1)[0]
        for n, command in enumerate((
            # The spelling a real fix-loop controller used (run f60b).
            f"L={LEDGER}\ncat >> \"$L\" <<'EOF'\nTask 6: complete (abc123)\nEOF\necho ok",
            f"D={folder}; echo 'Task 6: complete' >> \"${{D}}/progress.md\"",
            f"cat <<'EOF' >> {LEDGER}\nTask 6: complete (abc123)\nEOF",
            f"printf 'Task 6: complete (abc123)\\n' | tee -a {LEDGER} > /dev/null",
            # The control arm's r5 and r6 wrote the mark after a literal \n (README Correction 2).
            f"printf 'test_soak_long: Ran 1 test in 720.037s OK\\nTask 6: complete (abc123)\\n' >> {LEDGER}",
            # A path set by command substitution cannot be resolved statically.
            "W=$(cat /tmp/claude/b2b/sdd-dir.txt); cat >> \"$W/progress.md\" <<'EOF'\n- Task 6: complete (abc123)\nEOF",
            "D=\"$(bash scripts/sdd-dir plan.md)\"\necho 'Task 6: complete' >> \"$D/progress.md\"",
        )):
            written = five[:-1] + [
                assistant(1420, tools=[(f"v{n}", "Bash", {"command": command})]),
                result(1421, f"v{n}", "ok"),
                five[-1],
            ]
            self.assertTrue(self.run_of(f"v{n}", written, ledger=0)["plan_complete"], command)
        for n, command in enumerate((
            f"L={folder}/notes.md; echo 'Task 6: complete' >> \"$L\"",
            "cat >> \"$UNSET\" <<'EOF'\nTask 6: complete\nEOF",
            "W=$(pwd); echo 'Task 6: complete' >> \"$W/notes.md\"",
            f"echo 'ok' >> {LEDGER} # Task 6: complete",
        )):
            stray = five[:-1] + [
                assistant(1420, tools=[(f"w{n}", "Bash", {"command": command})]),
                result(1421, f"w{n}", "ok"),
                five[-1],
            ]
            self.assertFalse(self.run_of(f"w{n}", stray, ledger=0)["plan_complete"], command)

    def test_final_review_is_the_review_after_the_last_task(self) -> None:
        records = treatment_records()
        for rec in records:
            for use in liveness.tool_uses(rec):
                if use.get("id") == "a1":
                    use["input"]["prompt"] = "Implement Task 1. The final review runs after Task 6."
                if use.get("id") == "a2":
                    use["input"]["description"] = "Review code changes"
        m = self.run_of("f1", records)
        self.assertEqual(m["plan_at"], liveness.parse_ts(at(1400)).isoformat())
        self.assertTrue(m["final_review"])
        early = [r for r in drop_call(treatment_records(), "a2")]
        early[4:4] = [
            assistant(25, tools=[("r6", "Agent", {"description": "Review Task 6", "run_in_background": False})]),
            result(26, "r6", "Approved"),
        ]
        m = self.run_of("f2", early)
        self.assertFalse(m["final_review"])
        self.assertFalse(m["success"])
        # The controller reviews Task 6, dispatches the final review, and writes
        # the Task 6 mark only after it returns (three of four counted smoke runs).
        late = drop_call(treatment_records(), "lw6")
        tail = late[-3:]
        late = late[:-3] + [
            assistant(1410, tools=[("r6", "Agent", {"description": "Review Task 6 (spec + quality)", "run_in_background": False})]),
            result(1490, "r6", "Approved"),
            *tail[:2],
            assistant(1850, tools=[("e6", "Edit", {"file_path": LEDGER, "old_string": "x", "new_string": "Task 6: complete (abc123)"})]),
            result(1851, "e6", "edited"),
            tail[2],
        ]
        m = self.run_of("f3", late)
        self.assertEqual(m["plan_at"], liveness.parse_ts(at(1850)).isoformat())
        self.assertTrue(m["final_review"])
        self.assertTrue(m["success"])
        # Two task-scoped reviews with no final review are not a final review:
        # a task review then a re-review described without the word fix, and
        # a task review dispatched twice.
        no_final = drop_call(late, "a2")
        for rec in no_final:
            for use in liveness.tool_uses(rec):
                if use.get("id") == "r6":
                    use["input"]["description"] = "Re-review Task 6 (quality)"
        no_final[-4:-4] = [
            assistant(1300, tools=[("r5", "Agent", {"description": "Review Task 6 (spec + quality)", "run_in_background": False})]),
            result(1305, "r5", "Needs fixes"),
        ]
        self.assertFalse(self.run_of("f4", no_final)["final_review"])
        repeated = drop_call(late, "a2")
        repeated[-4:-4] = [
            assistant(1300, tools=[("r5", "Agent", {"description": "Review Task 6 (spec + quality)", "run_in_background": False})]),
            result(1305, "r5", "Approved"),
        ]
        self.assertFalse(self.run_of("f5", repeated)["final_review"])

    def test_long_job_needs_a_foreground_watch_that_saw_exit_zero(self) -> None:
        self.assertTrue(self.run_of("l1", long_job())["long_ok"])
        self.assertFalse(self.run_of("l2", long_job(watch_result="exit=1"))["long_ok"])
        self.assertFalse(self.run_of("l3", long_job(turn_end=True))["long_ok"])
        self.assertFalse(self.run_of("l4", long_job(watch=False))["long_ok"])
        # Deviation 6: an exit=0 seen 300 s after launch is too fast for a 720 s soak.
        self.assertFalse(self.run_of("l5", long_job(done_at=900))["long_ok"])

    def test_long_job_watch_must_read_its_own_exit_file(self) -> None:
        unrelated = long_job(watch=False)
        unrelated[-1:-1] = [
            assistant(1340, tools=[("u1", "Bash", {"command": "echo exit=0"})]),
            result(1341, "u1", "exit=0"),
        ]
        self.assertFalse(self.run_of("l6", unrelated)["long_ok"])
        auto = [
            human(0, "go"),
            assistant(600, tools=[("b2", "Bash", {"command": LONG_CMD, "timeout": 600000})]),
            result(1200, "b2", "Command did not complete within its 600s timeout and was moved to the background (ID: b2)."),
            assistant(1210, tools=[("b4", "Bash", {"command": WAIT_CMD, "timeout": 600000})]),
            enqueue(1330, "b2"),
            result(1345, "b4", "exit=0"),
            assistant(1350, "The long soak finished."),
        ]
        m = self.run_of("l7", auto)
        self.assertFalse(m["long_runs"][0]["background"])
        self.assertFalse(m["long_ok"])

    def test_auto_backgrounded_short_run_is_not_a_foreground_run(self) -> None:
        moved = "Command did not complete within its 240s timeout and was moved to the background (ID: b-auto)."
        records = [
            result(560, "b1", moved) if r.get("timestamp") == at(560) else r for r in treatment_records()
        ]
        for rec in records:
            for use in liveness.tool_uses(rec):
                if use.get("id") == "b1":
                    use["input"]["timeout"] = 240000
        m = self.run_of("s2", records)
        self.assertTrue(m["short_runs"][0]["background"])
        self.assertFalse(m["short_ok"])

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
        for n, command in enumerate((
            "cp /tmp/short.py tests/test_soak_short.py",
            "python3 -c \"from pathlib import Path; Path('tests/test_soak_long.py').write_text('')\"",
            "python3 - <<'EOF'\nopen('tests/test_soak_short.py', 'w').write('')\nEOF",
            "git checkout -- tests/test_soak_long.py",
            "sed -Ei 's/720/5/' tests/test_soak_long.py",
            "sed --in-place=.bak 's/240/5/' tests/test_soak_short.py",
            "cat <<'EOF' | python3\nopen('tests/test_soak_short.py', 'w').write('')\nEOF",
            "grep -n 'x' tests/test_soak_long.py; perl -pi -e 's/720/5/' tests/test_soak_long.py",
        )):
            written = treatment_records() + [
                assistant(2000, tools=[("m1", "Bash", {"command": command})]),
                result(2001, "m1", ""),
            ]
            self.assertTrue(self.run_of(f"k5{n}", written)["soak_tampered"], command)
        for n, command in enumerate((
            "git diff --quiet HEAD -- tests/test_soak_short.py tests/test_soak_long.py",
            "sed -n '1,20p' tests/test_soak_long.py | head -5",
            "python3 tests/test_soak_short.py",
            "grep -n SOAK_SECONDS tests/test_soak_long.py",
            # Routine reads seen in real runs: quoted pipes, git options, prefixes, echo banners.
            'grep -nE "SOAK|sleep" tests/test_soak_long.py',
            "git -C /x/coding-agent-workdir diff -- tests/test_soak_short.py",
            "git --no-pager diff HEAD -- tests/test_soak_long.py",
            "timeout 900 python3 -m unittest tests/test_soak_long.py",
            "python3 -m pytest tests/test_soak_short.py",
            "nl -ba tests/test_soak_short.py | sed -n '1,40p'",
            'echo "--- tests/test_soak_short.py ---"; cat tests/test_soak_short.py',
            "# look at tests/test_soak_long.py\ncat tests/test_soak_long.py",
        )):
            reads = treatment_records() + [
                assistant(2000, tools=[("m2", "Bash", {"command": command})]),
                result(2001, "m2", ""),
            ]
            self.assertFalse(self.run_of(f"k6{n}", reads)["soak_tampered"], command)

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
        lost = {
            "final": "indeterminate",
            "gauntlet": {
                "status": "investigate",
                "summary": "gauntlet exited (status 1) without writing a result",
                "reasoning": 'gauntlet stderr (tail): {"error":{"message":"getaddrinfo ENOTFOUND proxy.example"}}',
            },
        }
        self.assertEqual(analyze.void_kind(lost), "void-transport")
        reset = {**lost, "gauntlet": {**lost["gauntlet"], "reasoning": 'gauntlet stderr (tail): {"error":{"message":"ECONNRESET: The socket connection was closed unexpectedly."}}'}}
        self.assertEqual(analyze.void_kind(reset), "void-transport")
        judged = {**lost, "gauntlet": {**lost["gauntlet"], "reasoning": "the agent never answered"}}
        self.assertEqual(analyze.void_kind(judged), "void-grader")
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
            assistant(2044, tools=[("wt", "Write", {"file_path": "/nowhere/t.sh", "content": "echo hi\n"})]),
            result(2045, "wt", "written"),
            assistant(2046, tools=[("we", "Edit", {"file_path": "/nowhere/t.sh", "old_string": "echo hi", "new_string": "nohup sleep 1 &"})]),
            result(2047, "we", "edited"),
            assistant(2048, tools=[("wx", "Bash", {"command": "bash /nowhere/t.sh"})]),
            result(2049, "wx", ""),
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
                "/nowhere/t.sh",
                "/x/coding-agent-workdir/tools/e.sh",
            ],
        )
        self.assertEqual([u["detail"] for u in found if u["where"] == "command"], ["bash -c 'nohup sleep 9 &'"])

    def test_soak_execution_matching(self) -> None:
        self.assertTrue(analyze.runs_soak("python3 -m unittest tests.test_soak_short -v", "test_soak_short"))
        self.assertTrue(analyze.runs_soak("python3 -m unittest discover -s tests", "test_soak_long"))
        self.assertFalse(analyze.runs_soak('python3 -m unittest discover -s tests -p "test_unit_*.py"', "test_soak_long"))
        self.assertFalse(analyze.runs_soak("grep test_soak_short plan.md", "test_soak_short"))
        self.assertFalse(analyze.runs_soak('grep -n "unittest tests.test_soak_long" plan.md', "test_soak_long"))
        self.assertFalse(analyze.runs_soak('git commit -m "run python3 -m unittest tests.test_soak_short"', "test_soak_short"))
        self.assertTrue(analyze.runs_soak("cd /x && PYTHONPATH=. python3 -m unittest tests.test_soak_long -v", "test_soak_long"))
        self.assertTrue(analyze.runs_soak("nohup python3 -m unittest tests.test_soak_long -v > o 2>&1 &", "test_soak_long"))


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
